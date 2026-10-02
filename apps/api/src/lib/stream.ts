import { createHmac, timingSafeEqual } from "node:crypto";
import { importJWK, SignJWT } from "jose";
import { env, isProd } from "../env";
import { serviceUnavailable } from "./errors";

/** Subconjunto del objeto de video que devuelve la API de Stream (y el webhook). */
export interface StreamVideo {
  uid: string;
  readyToStream: boolean;
  requireSignedURLs: boolean;
  duration: number;
  status: { state: string; errorReasonCode?: string; errorReasonText?: string };
}

export function isStreamConfigured() {
  return !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_STREAM_API_TOKEN);
}

function assertConfigured() {
  if (!isStreamConfigured()) {
    throw serviceUnavailable(
      "Cloudflare Stream no está configurado (faltan CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_STREAM_API_TOKEN)",
    );
  }
}

const apiBase = () =>
  `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream`;

async function cf<T>(path: string, init: RequestInit = {}): Promise<T> {
  assertConfigured();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await res.json().catch(() => null)) as
    | { success: boolean; result: T; errors?: { message: string }[] }
    | null;
  if (!res.ok || !body?.success) {
    const detail = body?.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(`Cloudflare Stream ${init.method ?? "GET"} ${path}: ${detail}`);
  }
  return body.result;
}

const b64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

/** Hostnames desde los que se permite reproducir (solo en producción). */
function allowedOrigins(): string[] {
  return isProd ? [new URL(env.APP_URL).host] : [];
}

/**
 * Crea una subida tus de un solo uso. El navegador sube el archivo directamente
 * a la URL devuelta (opción `uploadUrl` de tus-js-client), sin pasar por la API.
 */
export async function createTusUpload(input: {
  sizeBytes: number;
  filename: string;
  maxDurationSeconds?: number;
}): Promise<{ uploadUrl: string; uid: string }> {
  assertConfigured();
  const expiry = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const metadata = [
    `name ${b64(input.filename)}`,
    "requiresignedurls",
    `maxdurationseconds ${b64(String(input.maxDurationSeconds ?? 6 * 60 * 60))}`,
    `expiry ${b64(expiry)}`,
  ];
  const origins = allowedOrigins();
  if (origins.length) metadata.push(`allowedorigins ${b64(origins.join(","))}`);

  const res = await fetch(`${apiBase()}?direct_user=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(input.sizeBytes),
      "Upload-Metadata": metadata.join(","),
    },
  });
  const uploadUrl = res.headers.get("location");
  const uid = res.headers.get("stream-media-id");
  if (!res.ok || !uploadUrl || !uid) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo crear la subida en Stream (${res.status}): ${text}`);
  }
  return { uploadUrl, uid };
}

export function getVideo(uid: string) {
  return cf<StreamVideo>(`/${uid}`);
}

/** Garantiza que el video exige URL firmada (y orígenes permitidos en producción). */
export function enforceVideoSecurity(uid: string) {
  return cf<StreamVideo>(`/${uid}`, {
    method: "POST",
    body: JSON.stringify({ uid, requireSignedURLs: true, allowedOrigins: allowedOrigins() }),
  });
}

export async function deleteVideo(uid: string) {
  if (!isStreamConfigured()) return;
  try {
    await cf<unknown>(`/${uid}`, { method: "DELETE" });
  } catch (err) {
    console.warn(`[stream] No se pudo borrar el video ${uid}:`, err);
  }
}

/** Traduce el estado de Stream a nuestro videoStatus. */
export function mapVideoState(video: StreamVideo) {
  if (video.readyToStream && video.status.state === "ready") return "ready" as const;
  if (video.status.state === "error") return "error" as const;
  if (video.status.state === "pendingupload") return "uploading" as const;
  return "processing" as const;
}

let signingKey: Awaited<ReturnType<typeof importJWK>> | null = null;

/**
 * Firma localmente un token de reproducción (RS256) con la signing key de Stream.
 * Evita una llamada a la API de Cloudflare por cada reproducción.
 */
export async function signPlaybackToken(uid: string, expiresInSec: number): Promise<string> {
  if (!env.STREAM_SIGNING_KEY_ID || !env.STREAM_SIGNING_KEY_JWK) {
    throw serviceUnavailable("Falta la signing key de Stream: ejecuta `pnpm stream:setup`");
  }
  if (!signingKey) {
    const jwk = JSON.parse(Buffer.from(env.STREAM_SIGNING_KEY_JWK, "base64").toString("utf8"));
    signingKey = await importJWK(jwk, "RS256");
  }
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  return new SignJWT({ sub: uid, kid: env.STREAM_SIGNING_KEY_ID, exp })
    .setProtectedHeader({ alg: "RS256", kid: env.STREAM_SIGNING_KEY_ID })
    .sign(signingKey);
}

/** Verifica la cabecera `Webhook-Signature: time=...,sig1=...` (HMAC-SHA256 de `time.body`). */
export function verifyWebhookSignature(header: string | undefined, rawBody: string): boolean {
  if (!header || !env.STREAM_WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key?.trim(), rest.join("=")];
    }),
  );
  const time = parts.time;
  const received = parts.sig1;
  if (!time || !received) return false;

  // Rechaza firmas de más de 5 minutos para evitar reenvíos.
  const ageSec = Math.abs(Date.now() / 1000 - Number(time));
  if (!Number.isFinite(ageSec) || ageSec > 300) return false;

  const expected = createHmac("sha256", env.STREAM_WEBHOOK_SECRET)
    .update(`${time}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---- Solo para scripts/stream-setup.ts ---- */

export function createSigningKey() {
  return cf<{ id: string; pem: string; jwk: string }>("/keys", { method: "POST" });
}

export function setWebhook(notificationUrl: string) {
  return cf<{ notificationUrl: string; secret: string }>("/webhook", {
    method: "PUT",
    body: JSON.stringify({ notificationUrl }),
  });
}
