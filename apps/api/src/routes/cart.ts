import {
  MIN_CHARGE_CENTS,
  type PricingCoupon,
  cartAddSchema,
  cartMergeSchema,
  checkoutSchema,
  couponValidateSchema,
  formatPrice,
  priceCart,
} from "@academia/shared";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { cartItems, courses, enrollments, orderItems, orders } from "../db/schema";
import { env } from "../env";
import type { AuthUser } from "../lib/auth";
import { badRequest, conflict } from "../lib/errors";
import { stripe } from "../lib/stripe";
import { validate } from "../lib/validate";
import { type AppEnv, currentUser, requireAuth } from "../middleware/auth";
import { courseCardQuery } from "../services/course-queries";
import { findUsableCoupon, reserveCouponRedemption } from "../services/coupons";
import { closeUnpaidOrder, enrollFree } from "../services/orders";

/** Minutos que dura una Checkout Session (Stripe exige al menos 30). */
const CHECKOUT_TTL_MIN = 31;

async function ownedCourseIds(userId: string, courseIds: string[]) {
  if (!courseIds.length) return new Set<string>();
  const rows = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        inArray(enrollments.courseId, courseIds),
        isNull(enrollments.revokedAt),
      ),
    );
  return new Set(rows.map((r) => r.courseId));
}

/** Cursos comprables (publicados y no inscritos) a partir de una lista de ids. */
async function purchasableCourses(user: AuthUser, courseIds: string[]) {
  if (!courseIds.length) return [];
  const rows = await courseCardQuery().where(
    and(inArray(courses.id, courseIds), eq(courses.status, "published")),
  );
  const owned = await ownedCourseIds(user.id, courseIds);
  return rows.filter((r) => !owned.has(r.id));
}

async function cartCourseIds(userId: string) {
  const rows = await db
    .select({ courseId: cartItems.courseId })
    .from(cartItems)
    .where(eq(cartItems.userId, userId))
    .orderBy(cartItems.createdAt);
  return rows.map((r) => r.courseId);
}

async function loadCart(user: AuthUser) {
  const ids = await cartCourseIds(user.id);
  const items = await purchasableCourses(user, ids);
  // Limpia del carrito lo que ya no se puede comprar (despublicado o ya inscrito).
  const stale = ids.filter((id) => !items.some((i) => i.id === id));
  if (stale.length) {
    await db.delete(cartItems).where(and(eq(cartItems.userId, user.id), inArray(cartItems.courseId, stale)));
  }
  return items;
}

async function resolveCoupon(code: string | undefined) {
  if (!code) return null;
  const check = await findUsableCoupon(db, code);
  if (!check.ok) throw badRequest(check.reason);
  return check;
}

function pricingSummary(
  items: Awaited<ReturnType<typeof purchasableCourses>>,
  coupon: PricingCoupon | null,
  couponCode: string | null,
) {
  const priced = priceCart(
    items.map((i) => ({ courseId: i.id, priceCents: i.priceCents })),
    coupon,
  );
  return {
    items: items.map((item) => {
      const line = priced.lines.find((l) => l.courseId === item.id)!;
      return { ...item, discountCents: line.discountCents, totalCents: line.totalCents };
    }),
    subtotalCents: priced.subtotalCents,
    discountCents: priced.discountCents,
    totalCents: priced.totalCents,
    couponCode: priced.couponApplied ? couponCode : null,
    currency: items[0]?.currency ?? env.CURRENCY,
  };
}

export const cartRoutes = new Hono<AppEnv>()
  .get("/cart", requireAuth, async (c) => {
    const user = currentUser(c);
    return c.json(pricingSummary(await loadCart(user), null, null));
  })

  .post("/cart", requireAuth, validate("json", cartAddSchema), async (c) => {
    const user = currentUser(c);
    const { courseId } = c.req.valid("json");
    const [course] = await purchasableCourses(user, [courseId]);
    if (!course) throw badRequest("Este curso no está disponible o ya lo tienes");
    if (course.priceCents === 0) throw badRequest("Los cursos gratis no van al carrito: inscríbete directamente");
    await db.insert(cartItems).values({ userId: user.id, courseId }).onConflictDoNothing();
    return c.json(pricingSummary(await loadCart(user), null, null));
  })

  .delete("/cart/:courseId", requireAuth, async (c) => {
    const user = currentUser(c);
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, user.id), eq(cartItems.courseId, c.req.param("courseId"))));
    return c.json(pricingSummary(await loadCart(user), null, null));
  })

  /** Fusiona el carrito de invitado (localStorage) al iniciar sesión. */
  .post("/cart/merge", requireAuth, validate("json", cartMergeSchema), async (c) => {
    const user = currentUser(c);
    const items = (await purchasableCourses(user, c.req.valid("json").courseIds)).filter(
      (i) => i.priceCents > 0,
    );
    if (items.length) {
      await db
        .insert(cartItems)
        .values(items.map((i) => ({ userId: user.id, courseId: i.id })))
        .onConflictDoNothing();
    }
    return c.json(pricingSummary(await loadCart(user), null, null));
  })

  .post("/coupons/validate", requireAuth, validate("json", couponValidateSchema), async (c) => {
    const user = currentUser(c);
    const input = c.req.valid("json");
    const items = input.courseIds ? await purchasableCourses(user, input.courseIds) : await loadCart(user);
    const coupon = await resolveCoupon(input.code);
    const summary = pricingSummary(items, coupon!.pricing, coupon!.coupon.code);
    if (summary.discountCents === 0) throw badRequest("El cupón no aplica a los cursos de tu carrito");
    return c.json(summary);
  })

  /**
   * Crea la orden y la Checkout Session. El precio lo calcula siempre el servidor
   * (priceCart) y se envía a Stripe ya rebajado por línea: Stripe no necesita
   * conocer productos ni cupones.
   */
  .post("/checkout", requireAuth, validate("json", checkoutSchema), async (c) => {
    const user = currentUser(c);
    const input = c.req.valid("json");

    const items = input.courseId
      ? await purchasableCourses(user, [input.courseId])
      : await loadCart(user);
    if (!items.length) throw badRequest("No hay cursos para comprar");

    const coupon = await resolveCoupon(input.couponCode);
    const priced = priceCart(
      items.map((i) => ({ courseId: i.id, priceCents: i.priceCents })),
      coupon?.pricing,
    );
    if (coupon && !priced.couponApplied) throw badRequest("El cupón no aplica a estos cursos");
    if (priced.totalCents > 0 && priced.totalCents < MIN_CHARGE_CENTS) {
      throw badRequest(`El total mínimo para pagar con tarjeta es ${formatPrice(MIN_CHARGE_CENTS, env.CURRENCY)}`);
    }

    // Cursos gratis sin cupón: matrícula directa, sin orden.
    if (priced.totalCents === 0 && !coupon) {
      await enrollFree(user.id, items.map((i) => i.id), null);
      return c.json({ type: "enrolled" as const, url: null, courseSlugs: items.map((i) => i.slug) });
    }

    // Falla pronto (503) si Stripe no está configurado, antes de crear la orden o reservar el cupón.
    if (priced.totalCents > 0) stripe();

    const currency = items[0]!.currency;
    const now = new Date();

    // Órdenes pendientes anteriores: se cierran para no pagar dos veces el mismo curso.
    const previous = await db
      .select({ id: orders.id, sessionId: orders.stripeCheckoutSessionId })
      .from(orders)
      .where(and(eq(orders.userId, user.id), eq(orders.status, "pending")));
    for (const order of previous) {
      if (order.sessionId) {
        await stripe()
          .checkout.sessions.expire(order.sessionId)
          .catch(() => undefined);
      }
      await closeUnpaidOrder(order.id, "expired");
    }

    const order = await db.transaction(async (tx) => {
      if (coupon && !(await reserveCouponRedemption(tx, coupon.coupon.id, now))) {
        throw conflict("El cupón se acaba de agotar");
      }
      const [created] = await tx
        .insert(orders)
        .values({
          userId: user.id,
          status: priced.totalCents === 0 ? "paid" : "pending",
          currency,
          subtotalCents: priced.subtotalCents,
          discountCents: priced.discountCents,
          totalCents: priced.totalCents,
          couponId: coupon?.coupon.id ?? null,
          couponCode: coupon?.coupon.code ?? null,
          couponReserved: !!coupon,
          expiresAt: new Date(now.getTime() + CHECKOUT_TTL_MIN * 60_000),
          paidAt: priced.totalCents === 0 ? now : null,
          amountPaidCents: priced.totalCents === 0 ? 0 : null,
        })
        .returning();
      await tx.insert(orderItems).values(
        priced.lines.map((line) => ({
          orderId: created!.id,
          courseId: line.courseId,
          courseTitle: items.find((i) => i.id === line.courseId)!.title,
          priceCents: line.priceCents,
          discountCents: line.discountCents,
        })),
      );
      return created!;
    });

    // Total 0 gracias a un cupón: orden pagada sin pasar por Stripe.
    if (priced.totalCents === 0) {
      await enrollFree(user.id, items.map((i) => i.id), order.id);
      return c.json({ type: "enrolled" as const, url: null, courseSlugs: items.map((i) => i.slug) });
    }

    try {
      const session = await stripe().checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        client_reference_id: user.id,
        locale: "es",
        line_items: priced.lines
          .filter((line) => line.totalCents > 0)
          .map((line) => {
            const course = items.find((i) => i.id === line.courseId)!;
            return {
              quantity: 1,
              price_data: {
                currency: currency.toLowerCase(),
                unit_amount: line.totalCents,
                product_data: {
                  name: course.title,
                  ...(line.discountCents > 0 && coupon
                    ? { description: `Cupón ${coupon.coupon.code}: -${formatPrice(line.discountCents, currency)}` }
                    : {}),
                  ...(course.coverImageUrl ? { images: [course.coverImageUrl] } : {}),
                },
              },
            };
          }),
        metadata: { orderId: order.id },
        payment_intent_data: { metadata: { orderId: order.id } },
        expires_at: Math.floor(order.expiresAt!.getTime() / 1000),
        success_url: `${env.APP_URL}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.APP_URL}/carrito?cancelado=1`,
      });

      await db.update(orders).set({ stripeCheckoutSessionId: session.id }).where(eq(orders.id, order.id));
      if (!session.url) throw new Error("Stripe no devolvió la URL del checkout");
      return c.json({ type: "redirect" as const, url: session.url, courseSlugs: [] as string[] });
    } catch (err) {
      await closeUnpaidOrder(order.id, "failed");
      throw err;
    }
  });
