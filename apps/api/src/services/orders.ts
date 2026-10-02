import type { OrderStatus } from "@academia/shared";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { cartItems, coupons, enrollments, orderItems, orders, user as userTable } from "../db/schema";
import { emails, sendEmail } from "../lib/email";
import { releaseCouponRedemption } from "./coupons";
import { recalcCourseStudents } from "./course-stats";

/**
 * Marca la orden como pagada y matricula al alumno. Idempotente: si la orden
 * ya estaba pagada no hace nada. Bloquea la fila para evitar dobles entregas.
 */
export async function fulfillOrder(
  orderId: string,
  payment: { amountPaidCents: number | null; paymentIntentId: string | null },
) {
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order || order.status === "paid") return null;
    if (order.status === "refunded" || order.status === "disputed") return null;

    // Pago tardío de una orden ya cerrada (expirada o fallida): su reserva de cupón se liberó
    // al cerrarla, así que el canje se vuelve a contar para no superar el máximo de usos.
    const recountCoupon = !!order.couponId && !order.couponReserved;
    if (recountCoupon) {
      await tx
        .update(coupons)
        .set({ redemptionsCount: sql`${coupons.redemptionsCount} + 1` })
        .where(eq(coupons.id, order.couponId!));
    }

    await tx
      .update(orders)
      .set({
        status: "paid",
        paidAt: new Date(),
        amountPaidCents: payment.amountPaidCents ?? order.totalCents,
        stripePaymentIntentId: payment.paymentIntentId ?? order.stripePaymentIntentId,
        couponReserved: order.couponId ? true : order.couponReserved,
      })
      .where(eq(orders.id, orderId));

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const courseIds = items.map((i) => i.courseId);

    if (courseIds.length) {
      await tx
        .insert(enrollments)
        .values(courseIds.map((courseId) => ({ userId: order.userId, courseId, orderId })))
        .onConflictDoUpdate({
          // Si la matrícula estaba revocada (reembolso anterior) y vuelve a comprar, se reactiva.
          target: [enrollments.userId, enrollments.courseId],
          set: { revokedAt: null, orderId },
          setWhere: sql`${enrollments.revokedAt} is not null`,
        });
      await tx
        .delete(cartItems)
        .where(and(eq(cartItems.userId, order.userId), inArray(cartItems.courseId, courseIds)));
      for (const courseId of courseIds) await recalcCourseStudents(tx, courseId);
    }

    return { order, items };
  });

  if (result) await sendOrderReceipt(orderId);
}

/** Envía el recibo de una orden pagada (con Stripe o gratis gracias a un cupón). */
export async function sendOrderReceipt(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return;
  const [items, buyer] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    db.query.user.findFirst({ columns: { name: true, email: true }, where: eq(userTable.id, order.userId) }),
  ]);
  if (!buyer) return;
  await sendEmail({
    to: buyer.email,
    ...emails.purchaseReceipt(
      buyer.name,
      order,
      items.map((i) => ({ title: i.courseTitle, totalCents: i.priceCents - i.discountCents })),
    ),
  });
}

/** Orden pendiente que no se pagó: libera la reserva del cupón. */
export async function closeUnpaidOrder(orderId: string, status: Extract<OrderStatus, "expired" | "failed">) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order || order.status !== "pending") return;
    if (order.couponReserved && order.couponId) await releaseCouponRedemption(tx, order.couponId);
    await tx.update(orders).set({ status, couponReserved: false }).where(eq(orders.id, orderId));
  });
}

/** Reembolso o disputa: revoca las matrículas que dio esta orden. */
export async function revokeOrder(orderId: string, status: Extract<OrderStatus, "refunded" | "disputed">) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order || order.status === status) return;
    await tx
      .update(orders)
      .set({ status, refundedAt: status === "refunded" ? new Date() : order.refundedAt })
      .where(eq(orders.id, orderId));
    const revoked = await tx
      .update(enrollments)
      .set({ revokedAt: new Date() })
      .where(and(eq(enrollments.orderId, orderId), isNull(enrollments.revokedAt)))
      .returning({ courseId: enrollments.courseId });
    for (const { courseId } of revoked) await recalcCourseStudents(tx, courseId);
  });
}

/** Matrícula directa (cursos gratis o total 0 tras cupón). */
export async function enrollFree(userId: string, courseIds: string[], orderId: string | null) {
  if (!courseIds.length) return;
  await db.transaction(async (tx) => {
    await tx
      .insert(enrollments)
      .values(courseIds.map((courseId) => ({ userId, courseId, orderId })))
      .onConflictDoUpdate({
        target: [enrollments.userId, enrollments.courseId],
        set: { revokedAt: null, orderId },
        setWhere: sql`${enrollments.revokedAt} is not null`,
      });
    await tx
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), inArray(cartItems.courseId, courseIds)));
    for (const courseId of courseIds) await recalcCourseStudents(tx, courseId);
  });
}
