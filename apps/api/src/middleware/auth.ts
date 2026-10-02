import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { type AuthSession, type AuthUser, auth } from "../lib/auth";
import { forbidden, unauthorized } from "../lib/errors";
import { adminDocs, sessionDocs, withDocs } from "../lib/openapi";

export type AppEnv = {
  Variables: {
    user: AuthUser | null;
    session: AuthSession | null;
  };
};

/** Carga la sesión (si hay cookie) en c.var.user / c.var.session. */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", result?.user ?? null);
  c.set("session", result?.session ?? null);
  await next();
});

// withDocs: cada ruta que use estos middlewares queda documentada con la cookie de sesión y sus 401/403.
export const requireAuth = withDocs(
  createMiddleware<AppEnv>(async (c, next) => {
    if (!c.get("user")) throw unauthorized();
    await next();
  }),
  sessionDocs,
);

export const requireAdmin = withDocs(
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) throw unauthorized();
    if (user.role !== "admin") throw forbidden("Solo para administradores");
    await next();
  }),
  adminDocs,
);

/** Usuario autenticado (lanza 401 si no lo hay). */
export function currentUser(c: Context<AppEnv>): AuthUser {
  const user = c.get("user");
  if (!user) throw unauthorized();
  return user;
}

export const isAdmin = (user: AuthUser | null | undefined) => user?.role === "admin";
