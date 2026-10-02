import { HTTPException } from "hono/http-exception";

export const badRequest = (message = "Solicitud no válida") => new HTTPException(400, { message });
export const unauthorized = (message = "Inicia sesión para continuar") =>
  new HTTPException(401, { message });
export const forbidden = (message = "No tienes acceso a este recurso") =>
  new HTTPException(403, { message });
export const notFound = (message = "No encontrado") => new HTTPException(404, { message });
export const conflict = (message: string) => new HTTPException(409, { message });
export const serviceUnavailable = (message: string) => new HTTPException(503, { message });
