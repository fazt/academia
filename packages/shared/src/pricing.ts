import type { CouponType } from "./enums";

/** Stripe no acepta cobros por debajo de este mínimo (USD). */
export const MIN_CHARGE_CENTS = 50;

export interface PricingItem {
  courseId: string;
  priceCents: number;
}

export interface PricingCoupon {
  type: CouponType;
  /** percent: 1-100 · amount: céntimos */
  value: number;
  appliesToAll: boolean;
  courseIds: string[];
}

export interface PricedLine {
  courseId: string;
  priceCents: number;
  discountCents: number;
  totalCents: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  /** true si el cupón aplica al menos a una línea */
  couponApplied: boolean;
}

/**
 * Calcula el total del carrito. La usan la validación del cupón en el carrito
 * y la creación del checkout, para que ambos den siempre el mismo resultado.
 */
export function priceCart(items: PricingItem[], coupon?: PricingCoupon | null): PricedCart {
  const eligible = (item: PricingItem) =>
    !!coupon && item.priceCents > 0 && (coupon.appliesToAll || coupon.courseIds.includes(item.courseId));

  const discounts = new Map<string, number>();

  if (coupon) {
    const eligibleItems = items.filter(eligible);
    if (coupon.type === "percent") {
      const pct = Math.min(Math.max(coupon.value, 0), 100);
      for (const item of eligibleItems) {
        discounts.set(item.courseId, Math.round((item.priceCents * pct) / 100));
      }
    } else {
      const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.priceCents, 0);
      const amount = Math.min(Math.max(coupon.value, 0), eligibleSubtotal);
      let remaining = amount;
      eligibleItems.forEach((item, index) => {
        const isLast = index === eligibleItems.length - 1;
        const share = isLast
          ? remaining
          : Math.min(remaining, Math.floor((amount * item.priceCents) / eligibleSubtotal));
        discounts.set(item.courseId, share);
        remaining -= share;
      });
    }
  }

  const lines = items.map((item) => {
    const discountCents = Math.min(discounts.get(item.courseId) ?? 0, item.priceCents);
    return {
      courseId: item.courseId,
      priceCents: item.priceCents,
      discountCents,
      totalCents: item.priceCents - discountCents,
    };
  });

  const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents, 0);
  const discountCents = lines.reduce((sum, l) => sum + l.discountCents, 0);

  return {
    lines,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    couponApplied: discountCents > 0,
  };
}
