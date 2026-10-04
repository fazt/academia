"use client";

import { loginSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, MailWarning } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AuthCard, authLinkClass } from "@/components/auth/auth-card";
import { type EnabledProviders, SocialSignIn } from "@/components/auth/social-sign-in";
import { SubmitButton, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { authClient, signIn } from "@/lib/auth-client";
import { authErrorMessage, oauthErrorMessage, safeRedirect } from "@/lib/auth-errors";

type Values = z.infer<typeof loginSchema>;

export function LoginForm({ providers }: { providers: EnabledProviders | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = safeRedirect(params.get("redirect"));
  // Better Auth vuelve aquí con ?error=<código> si falla el acceso con un proveedor.
  const [oauthError, setOauthError] = useState(() => params.get("error"));
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: Values) => {
    setOauthError(null);
    setUnverifiedEmail(null);
    const { error } = await signIn.email(values);
    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED" || error.status === 403) {
        setUnverifiedEmail(values.email);
        return;
      }
      toast.error(authErrorMessage(error));
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  const resend = async () => {
    if (!unverifiedEmail) return;
    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: unverifiedEmail,
      callbackURL: "/verificar-email",
    });
    setResending(false);
    if (error) toast.error(authErrorMessage(error));
    else toast.success("Te enviamos un nuevo enlace de confirmación");
  };

  return (
    <AuthCard
      file="login.sh"
      title="Bienvenido de nuevo"
      description="Inicia sesión para continuar aprendiendo."
      footer={
        <span>
          ¿No tienes cuenta?{" "}
          <Link href={`/registro${params.get("redirect") ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className={authLinkClass}>
            crea una gratis →
          </Link>
        </span>
      }
    >
      {oauthError === "email_not_verified" ? (
        <div role="status" className="flex gap-3 rounded-[10px] border border-term-num/30 bg-term-num/10 p-3 text-sm">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-term-num" />
          <p>{oauthErrorMessage(oauthError)}</p>
        </div>
      ) : (
        oauthError && (
          <div role="alert" className="flex gap-3 rounded-[10px] border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>{oauthErrorMessage(oauthError)}</p>
          </div>
        )
      )}
      {unverifiedEmail && (
        <div className="flex gap-3 rounded-[10px] border border-term-num/30 bg-term-num/10 p-3 text-sm">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-term-num" />
          <div className="space-y-2">
            <p>Confirma tu email para entrar. Revisa tu bandeja de entrada (y la de spam).</p>
            <Button size="sm" variant="outline" onClick={resend} disabled={resending}>
              reenviar enlace
            </Button>
          </div>
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <SocialSignIn enabled={providers} redirectTo={redirectTo} />
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <div className="space-y-2">
            <TextField
              control={form.control}
              name="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
            />
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-term-muted underline-offset-4 hover:text-term-text hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
          <SubmitButton pending={form.formState.isSubmitting} className="w-full" size="lg">
            iniciar sesión
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
