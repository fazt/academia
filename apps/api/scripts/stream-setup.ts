/**
 * Configura Cloudflare Stream para esta instalación:
 *   1. Crea una signing key (para firmar localmente los tokens de reproducción).
 *   2. Opcional: registra la URL del webhook y muestra su secreto.
 *
 * Uso:
 *   pnpm stream:setup
 *   pnpm stream:setup --webhook-url https://tu-dominio.com/api/webhooks/stream
 *
 * El webhook de Stream es uno por cuenta: si desarrollo y producción comparten
 * cuenta, el último que se registre gana (la API ignora videos que no conoce).
 */
import { createSigningKey, isStreamConfigured, setWebhook } from "../src/lib/stream";

if (!isStreamConfigured()) {
  console.error("Define CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_STREAM_API_TOKEN en apps/api/.env");
  process.exit(1);
}

const flagIndex = process.argv.indexOf("--webhook-url");
const webhookUrl = flagIndex > -1 ? process.argv[flagIndex + 1] : undefined;

const key = await createSigningKey();
console.log("\nSigning key creada. Añade a apps/api/.env:\n");
console.log(`STREAM_SIGNING_KEY_ID=${key.id}`);
console.log(`STREAM_SIGNING_KEY_JWK=${key.jwk}`);

if (webhookUrl) {
  const webhook = await setWebhook(webhookUrl);
  console.log(`STREAM_WEBHOOK_SECRET=${webhook.secret}`);
  console.log(`\nWebhook registrado en ${webhook.notificationUrl}`);
} else {
  console.log("\nSin --webhook-url no se registra el webhook. En local el panel consulta el estado del video directamente.");
}
