import type { AppType } from "@academia/api";
import { hc } from "hono/client";

/**
 * Cliente RPC tipado para el navegador. Va al mismo origen (/api), así que la
 * cookie de sesión viaja sola.
 */
export const api = hc<AppType>(typeof window === "undefined" ? "http://localhost" : window.location.origin).api;

export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type JsonResponse = { ok: boolean; status: number; json(): Promise<unknown> };

/** Espera la respuesta y devuelve el JSON tipado, o lanza ApiError con el mensaje de la API. */
export async function call<R extends JsonResponse>(
  request: Promise<R>,
): Promise<Awaited<ReturnType<R["json"]>>> {
  let res: R;
  try {
    res = await request;
  } catch {
    throw new ApiError("No se pudo conectar con el servidor", 0);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; issues?: ApiIssue[] } | null;
    throw new ApiError(body?.error ?? "Algo salió mal", res.status, body?.issues ?? []);
  }
  return (await res.json()) as Awaited<ReturnType<R["json"]>>;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Algo salió mal";
}
