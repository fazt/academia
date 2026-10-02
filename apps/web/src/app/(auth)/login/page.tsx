import type { Metadata } from "next";
import { Suspense } from "react";
import { publicApi, tryJson } from "@/lib/server-api";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const providers = await tryJson(publicApi["auth-providers"].$get());
  return (
    <Suspense>
      <LoginForm githubEnabled={!!providers?.github} />
    </Suspense>
  );
}
