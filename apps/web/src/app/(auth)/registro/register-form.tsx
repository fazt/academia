"use client";

import { registerSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AuthCard, authLinkClass } from "@/components/auth/auth-card";
import { type EnabledProviders, SocialSignIn } from "@/components/auth/social-sign-in";
import { SubmitButton, TextField } from "@/components/form/fields";
import { FieldGroup } from "@/components/ui/field";
import { signUp } from "@/lib/auth-client";
import { authErrorMessage, safeRedirect } from "@/lib/auth-errors";

type Values = z.infer<typeof registerSchema>;

export function RegisterForm({ providers }: { providers: EnabledProviders | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeRedirect(params.get("redirect"));

  const form = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: Values) => {
    const { data, error } = await signUp.email({ ...values, callbackURL: "/verificar-email" });
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    // Con verificación obligatoria no hay sesión hasta confirmar el email.
    if (data && "token" in data && data.token) {
      router.push(redirectTo);
      router.refresh();
      return;
    }
    router.push(`/verificar-email?enviado=1&email=${encodeURIComponent(values.email)}`);
  };

  return (
    <AuthCard
      file="registro.sh"
      title="Crea tu cuenta"
      description="Empieza a aprender hoy mismo: solo necesitas un email."
      footer={
        <span>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className={authLinkClass}>
            inicia sesión →
          </Link>
        </span>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <SocialSignIn enabled={providers} redirectTo={redirectTo} />
          <TextField control={form.control} name="name" label="Nombre" autoComplete="name" />
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <TextField
            control={form.control}
            name="password"
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            description="Mínimo 8 caracteres."
          />
          <SubmitButton pending={form.formState.isSubmitting} className="w-full" size="lg">
            crear cuenta
          </SubmitButton>
          <p className="text-center text-xs text-term-muted">
            Al registrarte aceptas los{" "}
            <Link href="/terminos" className="underline underline-offset-2 hover:text-term-text">
              términos
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="underline underline-offset-2 hover:text-term-text">
              política de privacidad
            </Link>
            .
          </p>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
