import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailStatus } from "./verify-email-status";

export const metadata: Metadata = { title: "Confirma tu email" };

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailStatus />
    </Suspense>
  );
}
