import type { Metadata } from "next";
import { Suspense } from "react";
import { publicApi, tryJson } from "@/lib/server-api";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  const providers = await tryJson(publicApi["auth-providers"].$get());
  return (
    <Suspense>
      <RegisterForm githubEnabled={!!providers?.github} />
    </Suspense>
  );
}
