import type { Metadata } from "next";
import { Suspense } from "react";
import { publicApi, tryJson } from "@/lib/server-api";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  // Sin respuesta de la API (p. ej. en el build) se muestra solo el registro con email.
  const providers = await tryJson(publicApi["auth-providers"].$get());
  return (
    <Suspense>
      <RegisterForm microsoft={providers?.microsoft ?? false} />
    </Suspense>
  );
}
