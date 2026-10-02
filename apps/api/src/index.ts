import { serve } from "@hono/node-server";
import app from "./app";
import { env } from "./env";

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API escuchando en http://localhost:${info.port}/api`);
});
