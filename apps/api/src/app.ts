import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { ZodError } from "zod";
import { auth } from "./lib/auth";
import { type AppEnv, sessionMiddleware } from "./middleware/auth";
import { adminRoutes } from "./routes/admin";
import { cartRoutes } from "./routes/cart";
import { learnRoutes } from "./routes/learn";
import { meRoutes } from "./routes/me";
import { publicRoutes } from "./routes/public";
import { webhookRoutes } from "./routes/webhooks";

const app = new Hono<AppEnv>().basePath("/api");

app.use(logger());
app.use(secureHeaders());

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.cause instanceof ZodError) {
      return c.json(
        {
          error: err.message,
          issues: err.cause.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        400,
      );
    }
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Error interno del servidor" }, 500);
});

app.notFound((c) => c.json({ error: "Ruta no encontrada" }, 404));

app.get("/health", (c) => c.json({ ok: true }));

// Better Auth gestiona sus propias rutas.
app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

// Los webhooks necesitan el cuerpo raw y no usan sesión.
app.route("/webhooks", webhookRoutes);

// Resto de la API: JSON de hasta 1 MB y sesión opcional en c.var.user.
app.use("*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/api/auth/") || path.startsWith("/api/webhooks/")) return next();
  return bodyLimit({ maxSize: 1024 * 1024 })(c, next);
});
app.use("*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/api/auth/") || path.startsWith("/api/webhooks/")) return next();
  return sessionMiddleware(c, next);
});

const routes = app
  .route("/", publicRoutes)
  .route("/", learnRoutes)
  .route("/", cartRoutes)
  .route("/me", meRoutes)
  .route("/admin", adminRoutes);

export type AppType = typeof routes;
export default app;
