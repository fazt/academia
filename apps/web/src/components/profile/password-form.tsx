"use client";

import { changePasswordSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { SubmitButton, TextField } from "@/components/form/fields";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

type PasswordValues = z.infer<typeof changePasswordSchema>;

/** Quien entró solo con un proveedor (Google, GitHub, Microsoft) no tiene contraseña: primero hay que crearla. */
export function PasswordForm({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  return hasPassword ? <ChangePasswordForm /> : <CreatePasswordCard email={email} />;
}

/**
 * Se crea con el mismo enlace por email que "¿Olvidaste tu contraseña?": Better Auth crea la
 * contraseña si no existe y, de paso, se demuestra que el email es tuyo.
 */
function CreatePasswordCard({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    setSent(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Contraseña</CardTitle>
        <CardDescription>Tu cuenta no tiene contraseña. Crea una si también quieres entrar con tu email.</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="flex gap-3 text-sm text-muted-foreground">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Te enviamos un enlace a <strong className="text-foreground">{email}</strong> para crear la contraseña.
              Caduca en 1 hora y, al usarlo, tendrás que volver a iniciar sesión.
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Te enviaremos un enlace a <strong className="text-foreground">{email}</strong> para elegirla.
          </p>
        )}
      </CardContent>
      {!sent && (
        <CardFooter className="mt-6 justify-end">
          <SubmitButton type="button" pending={pending} onClick={send}>
            Enviar enlace
          </SubmitButton>
        </CardFooter>
      )}
    </Card>
  );
}

function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const form = useForm<PasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const onSubmit = async (values: PasswordValues) => {
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      const invalid = error.code === "INVALID_PASSWORD" || error.status === 400;
      if (invalid) {
        form.setError("currentPassword", { message: "La contraseña actual no es correcta" });
      } else {
        toast.error(error.message ?? "No se pudo cambiar la contraseña");
      }
      return;
    }
    form.reset();
    toast.success("Contraseña actualizada. Cerramos tus otras sesiones abiertas.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Contraseña</CardTitle>
        <CardDescription>Al cambiarla se cerrarán tus sesiones en otros dispositivos.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardContent>
          <FieldGroup>
            <TextField
              control={form.control}
              name="currentPassword"
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
            />
            <TextField
              control={form.control}
              name="newPassword"
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              description="Mínimo 8 caracteres."
            />
            <TextField
              control={form.control}
              name="confirm"
              label="Repite la nueva contraseña"
              type="password"
              autoComplete="new-password"
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 justify-end">
          <SubmitButton pending={pending}>Cambiar contraseña</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
