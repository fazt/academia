import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodType } from "zod";

/**
 * zValidator que lanza un 400 con los errores de Zod. Al lanzar en vez de
 * devolver, los tipos del cliente RPC solo incluyen las respuestas correctas.
 */
export const validate = <T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      throw new HTTPException(400, { message: "Datos no válidos", cause: result.error });
    }
  });
