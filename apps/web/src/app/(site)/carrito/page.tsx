import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Carrito" };

export default function CartPage() {
  return (
    <Suspense>
      <CartView />
    </Suspense>
  );
}
