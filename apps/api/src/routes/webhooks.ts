import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type Stripe from "stripe";
import { db } from "../db";
import { chapters, orders, stripeEvents } from "../db/schema";
import { env } from "../env";
import { badRequest } from "../lib/errors";
import {
  type StreamVideo,
  enforceVideoSecurity,
  mapVideoState,
  verifyWebhookSignature,
} from "../lib/stream";
import { stripe } from "../lib/stripe";
import { recalcCourseContent } from "../services/course-stats";
import { closeUnpaidOrder, fulfillOrder, revokeOrder } from "../services/orders";

const paymentIntentId = (value: string | Stripe.PaymentIntent | null) =>
  typeof value === "string" ? value : (value?.id ?? null);

async function orderIdByPaymentIntent(intentId: string | null) {
  if (!intentId) return null;
  const order = await db.query.orders.findFirst({
    columns: { id: true },
    where: eq(orders.stripePaymentIntentId, intentId),
  });
  return order?.id ?? null;
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (!orderId) return;
      // Con métodos de pago asíncronos la sesión se completa sin cobrar: se espera a async_payment_succeeded.
      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        await db
          .update(orders)
          .set({ stripePaymentIntentId: paymentIntentId(session.payment_intent) })
          .where(eq(orders.id, orderId));
        return;
      }
      await fulfillOrder(orderId, {
        amountPaidCents: session.amount_total,
        paymentIntentId: paymentIntentId(session.payment_intent),
      });
      return;
    }
    case "checkout.session.async_payment_failed": {
      const orderId = event.data.object.metadata?.orderId;
      if (orderId) await closeUnpaidOrder(orderId, "failed");
      return;
    }
    case "checkout.session.expired": {
      const orderId = event.data.object.metadata?.orderId;
      if (orderId) await closeUnpaidOrder(orderId, "expired");
      return;
    }
    case "charge.refunded": {
      // Concilia reembolsos hechos desde el dashboard de Stripe. Los parciales no revocan acceso.
      const charge = event.data.object;
      if (!charge.refunded) {
        console.warn(`[stripe] Reembolso parcial en ${charge.id}: no se revoca el acceso`);
        return;
      }
      const orderId = await orderIdByPaymentIntent(paymentIntentId(charge.payment_intent));
      if (orderId) await revokeOrder(orderId, "refunded");
      return;
    }
    case "charge.dispute.created": {
      const dispute = event.data.object;
      const orderId = await orderIdByPaymentIntent(paymentIntentId(dispute.payment_intent));
      if (orderId) await revokeOrder(orderId, "disputed");
      return;
    }
    default:
      return;
  }
}

export const webhookRoutes = new Hono()
  .post("/stripe", async (c) => {
    if (!env.STRIPE_WEBHOOK_SECRET) throw badRequest("Webhook de Stripe no configurado");
    const signature = c.req.header("stripe-signature");
    if (!signature) throw badRequest("Falta la firma");
    const rawBody = await c.req.text();

    let event: Stripe.Event;
    try {
      event = await stripe().webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw badRequest("Firma de Stripe no válida");
    }

    // Idempotencia por event.id. Los manejadores también son idempotentes, así que
    // un reintento concurrente no duplica matrículas.
    const seen = await db.query.stripeEvents.findFirst({ where: eq(stripeEvents.id, event.id) });
    if (seen) return c.json({ received: true, duplicate: true });

    await handleStripeEvent(event);
    await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
    return c.json({ received: true });
  })

  .post("/stream", async (c) => {
    const rawBody = await c.req.text();
    if (!verifyWebhookSignature(c.req.header("webhook-signature"), rawBody)) {
      throw badRequest("Firma de Stream no válida");
    }
    const video = JSON.parse(rawBody) as StreamVideo;

    const chapter = await db.query.chapters.findFirst({
      columns: { id: true, courseId: true },
      where: eq(chapters.streamUid, video.uid),
    });
    // El webhook es uno por cuenta: ignora videos que no son de esta instalación.
    if (!chapter) return c.json({ received: true, ignored: true });

    const status = mapVideoState(video);
    if (status === "ready" && !video.requireSignedURLs) {
      await enforceVideoSecurity(video.uid);
    }
    await db
      .update(chapters)
      .set({ videoStatus: status, durationSec: video.duration > 0 ? Math.round(video.duration) : 0 })
      .where(eq(chapters.id, chapter.id));
    await recalcCourseContent(db, chapter.courseId);
    return c.json({ received: true });
  });
