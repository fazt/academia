import "server-only";
import type { AppType } from "@academia/api";
import { hc } from "hono/client";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:3011";

/**
 * Cliente para Server Components de páginas públicas. No reenvía cookies, así que
 * las respuestas se pueden cachear; lo personalizado se resuelve en el cliente.
 */
export const publicApi = hc<AppType>(API_INTERNAL_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, next: { revalidate: 60, tags: ["catalog"] } }),
}).api;

/**
 * Devuelve el JSON o null ante cualquier fallo (API caída, error HTTP). Para
 * secciones opcionales que deben degradar sin romper la página (por ejemplo, durante el build).
 */
export async function tryJson<R extends { ok: boolean; json(): Promise<unknown> }>(
  request: Promise<R>,
): Promise<Awaited<ReturnType<R["json"]>> | null> {
  try {
    const res = await request;
    return res.ok ? ((await res.json()) as Awaited<ReturnType<R["json"]>>) : null;
  } catch {
    return null;
  }
}

/** Devuelve el JSON o null si la API responde 404. Lanza en otros errores. */
export async function fetchOrNull<R extends { ok: boolean; status: number; json(): Promise<unknown> }>(
  request: Promise<R>,
): Promise<Awaited<ReturnType<R["json"]>> | null> {
  const res = await request;
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`La API respondió ${res.status}`);
  return (await res.json()) as Awaited<ReturnType<R["json"]>>;
}
