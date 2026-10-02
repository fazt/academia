import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { PresignInput } from "@academia/shared";
import { env } from "../env";
import { badRequest, serviceUnavailable } from "./errors";

let client: S3Client | null = null;

function s3(): S3Client {
  if (!env.SPACES_ENDPOINT || !env.SPACES_BUCKET || !env.SPACES_KEY || !env.SPACES_SECRET) {
    throw serviceUnavailable("La subida de archivos no está configurada (faltan las variables SPACES_*)");
  }
  client ??= new S3Client({
    endpoint: env.SPACES_ENDPOINT,
    region: env.SPACES_REGION,
    credentials: { accessKeyId: env.SPACES_KEY, secretAccessKey: env.SPACES_SECRET },
  });
  return client;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const RULES: Record<PresignInput["kind"], { maxBytes: number; types: string[] | null; public: boolean }> = {
  cover: { maxBytes: 5 * 1024 * 1024, types: IMAGE_TYPES, public: true },
  avatar: { maxBytes: 2 * 1024 * 1024, types: IMAGE_TYPES, public: true },
  resource: { maxBytes: 200 * 1024 * 1024, types: null, public: false },
};

function safeName(filename: string) {
  const clean = filename
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
  return clean || "archivo";
}

export function publicUrl(key: string) {
  const base = env.SPACES_PUBLIC_URL ?? `${env.SPACES_ENDPOINT}/${env.SPACES_BUCKET}`;
  return `${base.replace(/\/$/, "")}/${key}`;
}

/**
 * Crea un POST prefirmado. A diferencia de un PUT prefirmado, la política fija
 * el tamaño máximo (content-length-range) y el tipo de archivo.
 */
export async function presignUpload(input: PresignInput, ownerId: string) {
  const rule = RULES[input.kind];
  if (input.sizeBytes > rule.maxBytes) {
    throw badRequest(`El archivo supera el máximo de ${Math.round(rule.maxBytes / 1024 / 1024)} MB`);
  }
  if (rule.types && !rule.types.includes(input.contentType)) {
    throw badRequest("Formato no permitido. Usa JPG, PNG o WebP");
  }

  const prefix = input.kind === "avatar" ? `avatars/${ownerId}` : `${input.kind}s`;
  const key = `${prefix}/${randomUUID()}-${safeName(input.filename)}`;

  const fields: Record<string, string> = { "Content-Type": input.contentType };
  if (rule.public) fields.acl = "public-read";

  const { url, fields: signedFields } = await createPresignedPost(s3(), {
    Bucket: env.SPACES_BUCKET!,
    Key: key,
    Fields: fields,
    Conditions: [
      ["content-length-range", 1, rule.maxBytes],
      ["eq", "$Content-Type", input.contentType],
      ...(rule.public ? [{ acl: "public-read" }] : []),
    ],
    Expires: 600,
  });

  return {
    url,
    fields: signedFields,
    key,
    publicUrl: rule.public ? publicUrl(key) : null,
  };
}

/** URL de descarga temporal para archivos privados (recursos de capítulos). */
export function presignDownload(key: string, filename: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: env.SPACES_BUCKET!,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${safeName(filename)}"`,
    }),
    { expiresIn: 300 },
  );
}

export async function deleteObject(key: string) {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: env.SPACES_BUCKET!, Key: key }));
  } catch (err) {
    console.warn(`[storage] No se pudo borrar ${key}:`, err);
  }
}
