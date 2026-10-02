import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { type AuthSession, type AuthUser, auth } from "../lib/auth";
import { forbidden, unauthorized } from "../lib/errors";

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

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) throw unauthorized();
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) throw unauthorized();
  if (user.role !== "admin") throw forbidden("Solo para administradores");
  await next();
});

/** Usuario autenticado (lanza 401 si no lo hay). */
export function currentUser(c: Context<AppEnv>): AuthUser {
  const user = c.get("user");
  if (!user) throw unauthorized();
  return user;
}

export const isAdmin = (user: AuthUser | null | undefined) => user?.role === "admin";
