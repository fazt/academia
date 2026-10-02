import { defineConfig } from "vitest/config";

// Base de datos propia para los tests: se crea (si no existe) en el mismo Postgres de desarrollo.
const baseUrl = process.env.DATABASE_URL ?? "postgres://academia:academia@localhost:5437/academia";
process.env.DATABASE_URL = baseUrl.replace(/\/[^/?]+(\?.*)?$/, "/academia_test$1");
process.env.NODE_ENV = "test";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.APP_URL = "http://localhost:3010";
process.env.STRIPE_SECRET_KEY = "sk_test_integration_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_integration_test";
// Sin Resend los emails solo se imprimen; se silencian para no ensuciar la salida.
process.env.RESEND_API_KEY = "";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
