import { formatPrice } from "@academia/shared";
import { Resend } from "resend";
import { env } from "../env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/** Envía un email. Nunca lanza: un fallo de correo no debe romper una compra o un registro. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!resend) {
    console.info(`\n[email] Para: ${message.to}\n[email] Asunto: ${message.subject}\n${stripTags(message.html)}\n`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...message });
    if (error) console.error("[email] Resend devolvió un error:", error);
  } catch (err) {
    console.error("[email] No se pudo enviar el correo:", err);
  }
}

function stripTags(html: string) {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:14px;font-weight:bold;letter-spacing:.04em;color:#4f46e5">ACADEMIA</p>
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>
${body}
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#78716c">Recibes este correo por tu cuenta en Academia.</p>
</td></tr></table></body></html>`;
}

function button(url: string, label: string) {
  return `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${escapeHtml(label)}</a></p>
<p style="margin:0;font-size:12px;color:#78716c">Si el botón no funciona, copia este enlace: ${url}</p>`;
}

const p = (text: string) => `<p style="margin:0 0 12px;line-height:1.5">${text}</p>`;

export const emails = {
  verifyEmail: (name: string, url: string) => ({
    subject: "Confirma tu email",
    html: layout(
      `Hola, ${name}`,
      p("Confirma tu dirección de email para activar tu cuenta y empezar a aprender.") +
        button(url, "Confirmar email"),
    ),
  }),

  resetPassword: (name: string, url: string) => ({
    subject: "Restablece tu contraseña",
    html: layout(
      `Hola, ${name}`,
      p("Recibimos una solicitud para restablecer tu contraseña. El enlace caduca en 1 hora.") +
        button(url, "Elegir nueva contraseña") +
        p("Si no fuiste tú, ignora este correo."),
    ),
  }),

  purchaseReceipt: (
    name: string,
    order: { id: string; currency: string; totalCents: number; discountCents: number },
    items: { title: string; totalCents: number }[],
  ) => ({
    subject: "Tu compra está confirmada",
    html: layout(
      `¡Gracias por tu compra, ${name}!`,
      p("Ya tienes acceso a estos cursos:") +
        `<table width="100%" cellpadding="6" style="border-collapse:collapse;margin:8px 0 16px">${items
          .map(
            (i) =>
              `<tr><td style="border-bottom:1px solid #e7e5e4">${escapeHtml(i.title)}</td><td align="right" style="border-bottom:1px solid #e7e5e4">${formatPrice(i.totalCents, order.currency)}</td></tr>`,
          )
          .join("")}
        ${order.discountCents > 0 ? `<tr><td>Descuento</td><td align="right">-${formatPrice(order.discountCents, order.currency)}</td></tr>` : ""}
        <tr><td><strong>Total</strong></td><td align="right"><strong>${formatPrice(order.totalCents, order.currency)}</strong></td></tr></table>` +
        p(`Referencia del pedido: <code>${order.id.slice(0, 8).toUpperCase()}</code>`) +
        button(`${env.APP_URL}/mis-cursos`, "Ir a mis cursos"),
    ),
  }),

  certificateIssued: (name: string, courseTitle: string, code: string) => ({
    subject: `Tu certificado de «${courseTitle}»`,
    html: layout(
      `¡Enhorabuena, ${name}!`,
      p(`Completaste el curso <strong>${escapeHtml(courseTitle)}</strong>. Tu certificado ya está disponible.`) +
        button(`${env.APP_URL}/certificados/${code}`, "Ver certificado"),
    ),
  }),

  questionAnswered: (name: string, courseTitle: string, chapterTitle: string, url: string) => ({
    subject: "El instructor respondió tu pregunta",
    html: layout(
      `Hola, ${name}`,
      p(
        `El instructor respondió tu pregunta en <strong>${escapeHtml(chapterTitle)}</strong> del curso <strong>${escapeHtml(courseTitle)}</strong>.`,
      ) + button(url, "Ver respuesta"),
    ),
  }),
};
