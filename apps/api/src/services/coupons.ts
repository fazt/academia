import type { PricingCoupon } from "@academia/shared";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { DbOrTx } from "../db";
import { couponCourses, coupons } from "../db/schema";

export type CouponRow = typeof coupons.$inferSelect;

export type CouponCheck =
  | { ok: true; coupon: CouponRow; pricing: PricingCoupon }
  | { ok: false; reason: string };

/** Busca un cupón por código y comprueba si se puede usar ahora. */
export async function findUsableCoupon(tx: DbOrTx, rawCode: string, now = new Date()): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await tx.query.coupons.findFirst({ where: eq(coupons.code, code) });
  if (!coupon || !coupon.active) return { ok: false, reason: "El cupón no existe o no está activo" };
  if (coupon.expiresAt && coupon.expiresAt <= now) return { ok: false, reason: "El cupón ha caducado" };
  if (coupon.maxRedemptions !== null && coupon.redemptionsCount >= coupon.maxRedemptions) {
    return { ok: false, reason: "El cupón ya no tiene usos disponibles" };
  }

  const courseIds = coupon.appliesToAll
    ? []
    : (
        await tx
          .select({ courseId: couponCourses.courseId })
          .from(couponCourses)
          .where(eq(couponCourses.couponId, coupon.id))
      ).map((r) => r.courseId);

  return {
    ok: true,
    coupon,
    pricing: { type: coupon.type, value: coupon.value, appliesToAll: coupon.appliesToAll, courseIds },
  };
}

/**
 * Reserva un canje de forma atómica. Si dos alumnos compiten por el último uso,
 * solo uno consigue la fila actualizada.
 */
export async function reserveCouponRedemption(tx: DbOrTx, couponId: string, now = new Date()) {
  const [row] = await tx
    .update(coupons)
    .set({ redemptionsCount: sql`${coupons.redemptionsCount} + 1` })
    .where(
      and(
        eq(coupons.id, couponId),
        eq(coupons.active, true),
        or(isNull(coupons.expiresAt), gt(coupons.expiresAt, now)),
        or(isNull(coupons.maxRedemptions), lt(coupons.redemptionsCount, coupons.maxRedemptions)),
      ),
    )
    .returning({ id: coupons.id });
  return !!row;
}

export async function releaseCouponRedemption(tx: DbOrTx, couponId: string) {
  await tx
    .update(coupons)
    .set({ redemptionsCount: sql`greatest(${coupons.redemptionsCount} - 1, 0)` })
    .where(eq(coupons.id, couponId));
}
