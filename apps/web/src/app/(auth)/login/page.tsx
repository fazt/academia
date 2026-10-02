import type { Metadata } from "next";
import { Suspense } from "react";
import { publicApi, tryJson } from "@/lib/server-api";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  // Sin respuesta de la API (p. ej. en el build) se muestra solo el acceso con email.
  const providers = await tryJson(publicApi["auth-providers"].$get());
  return (
    <Suspense>
      <LoginForm microsoft={providers?.microsoft ?? false} />
    </Suspense>
  );
}
