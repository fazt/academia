"use client";

import { forgotPasswordSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AuthCard, authLinkClass } from "@/components/auth/auth-card";
import { SubmitButton, TextField } from "@/components/form/fields";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

type Values = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const onSubmit = async ({ email }: Values) => {
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    // Por seguridad la respuesta es la misma exista o no la cuenta.
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <AuthCard
        file="forgot-password.sh"
        title="Revisa tu correo"
        footer={
          <Link href="/login" className={authLinkClass}>
            ← volver a iniciar sesión
          </Link>
        }
      >
        <div className="flex gap-3 text-sm text-term-muted">
          <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-term-border bg-term-raised text-term-accent">
            <MailCheck className="size-5" />
          </span>
          <p>
            Si existe una cuenta con <strong className="font-term font-medium text-term-text">{sentTo}</strong>, recibirás
            un enlace para elegir una nueva contraseña. Caduca en 1 hora.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      file="forgot-password.sh"
      title="¿Olvidaste tu contraseña?"
      description="Te enviaremos un enlace para restablecerla."
      footer={
        <Link href="/login" className={authLinkClass}>
          ← volver a iniciar sesión
        </Link>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <SubmitButton pending={form.formState.isSubmitting} className="w-full" size="lg">
            enviar enlace
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
