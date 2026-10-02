import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3011),
  APP_URL: z.url().default("http://localhost:3010"),
  DATABASE_URL: z.string().min(1).default("postgres://academia:academia@localhost:5437/academia"),
  CURRENCY: z.string().length(3).default("USD"),
  // Documentación OpenAPI (/api/docs): siempre fuera de producción; en producción solo con "true".
  ENABLE_API_DOCS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  BETTER_AUTH_SECRET: z.string().min(16).default("dev-secret-change-me-dev-secret-change-me"),
  REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,

  GITHUB_CLIENT_ID: optional,
  GITHUB_CLIENT_SECRET: optional,

  MICROSOFT_CLIENT_ID: optional,
  MICROSOFT_CLIENT_SECRET: optional,
  // "common" admite cuentas personales y de trabajo; también "consumers", "organizations" o el ID de un tenant.
  MICROSOFT_TENANT_ID: optional.transform((v) => v ?? "common"),

  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("Academia <no-reply@example.com>"),

  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,

  CLOUDFLARE_ACCOUNT_ID: optional,
  CLOUDFLARE_STREAM_API_TOKEN: optional,
  STREAM_CUSTOMER_CODE: optional,
  STREAM_SIGNING_KEY_ID: optional,
  STREAM_SIGNING_KEY_JWK: optional,
  STREAM_WEBHOOK_SECRET: optional,

  SPACES_ENDPOINT: optional,
  SPACES_REGION: z.string().default("nyc3"),
  SPACES_BUCKET: optional,
  SPACES_KEY: optional,
  SPACES_SECRET: optional,
  SPACES_PUBLIC_URL: optional,

  SEED_ADMIN_EMAIL: z.email().default("admin@academia.test"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("admin12345"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Variables de entorno no válidas:", z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const apiDocsEnabled = !isProd || env.ENABLE_API_DOCS;
