"use client";

import { forgotPasswordSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
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
        title="Revisa tu correo"
        footer={
          <Link href="/login" className="font-medium text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" />
          </div>
          <p>
            Si existe una cuenta con <strong className="text-foreground">{sentTo}</strong>, recibirás un enlace para
            elegir una nueva contraseña. Caduca en 1 hora.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="¿Olvidaste tu contraseña?"
      description="Te enviaremos un enlace para restablecerla"
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <SubmitButton pending={form.formState.isSubmitting} className="w-full" size="lg">
            Enviar enlace
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
