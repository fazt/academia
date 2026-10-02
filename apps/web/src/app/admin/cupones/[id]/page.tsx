"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { CouponForm } from "@/components/admin/coupon-form";
import { NotFoundState } from "@/components/admin/not-found-state";
import { api, call } from "@/lib/api";

export default function EditCouponPage() {
  const { id } = useParams<{ id: string }>();
  const coupon = useQuery({
    queryKey: ["admin", "coupon", id],
    queryFn: () => call(api.admin.coupons[":id"].$get({ param: { id } })),
  });

  if (coupon.isLoading) return <AdminPageSkeleton />;
  if (!coupon.data) {
    return <NotFoundState error={coupon.error} title="Cupón no encontrado" backHref="/admin/cupones" backLabel="Volver a cupones" />;
  }

  const data = coupon.data;
  return (
    <div className="space-y-6">
      <AdminPageHeader title={`Cupón ${data.code}`} backHref="/admin/cupones" backLabel="Cupones" />
      <CouponForm
        couponId={id}
        redemptionsCount={data.redemptionsCount}
        initial={{
          code: data.code,
          type: data.type,
          value: data.value,
          appliesToAll: data.appliesToAll,
          courseIds: data.courseIds,
          maxRedemptions: data.maxRedemptions,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
          active: data.active,
        }}
      />
    </div>
  );
}
