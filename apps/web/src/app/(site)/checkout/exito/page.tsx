import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutSuccess } from "./checkout-success";

export const metadata: Metadata = { title: "Compra completada" };

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccess />
    </Suspense>
  );
}
