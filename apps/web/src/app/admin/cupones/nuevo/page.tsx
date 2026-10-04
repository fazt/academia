"use client";

import { AdminPageHeader } from "@/components/admin/admin-page";
import { CouponForm } from "@/components/admin/coupon-form";

export default function NewCouponPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Nuevo cupón" command="touch cupones/nuevo" backHref="/admin/cupones" backLabel="Cupones" />
      <CouponForm />
    </div>
  );
}
