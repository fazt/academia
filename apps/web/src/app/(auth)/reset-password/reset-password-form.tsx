"use client";

import { resetPasswordSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
import { SubmitButton, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

type Values = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");

  const form = useForm<Values>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!token || linkError) {
    return (
      <AuthCard
        file="reset-password.sh"
        title="Enlace no válido"
        description="El enlace para restablecer la contraseña no es válido o ha caducado."
      >
        <Button asChild className="w-full">
          <Link href="/forgot-password">pedir un enlace nuevo</Link>
        </Button>
      </AuthCard>
    );
  }

  const onSubmit = async ({ password }: Values) => {
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    // El reset revoca todas las sesiones, pero si se abrió el enlace con la sesión iniciada (al crear
    // la contraseña desde el perfil) la cookie sigue ahí y el proxy no dejaría entrar al login.
    await authClient.signOut();
    toast.success("Contraseña actualizada. Ya puedes iniciar sesión.");
    router.push("/login");
    router.refresh();
  };

  return (
    <AuthCard
      file="reset-password.sh"
      title="Elige una nueva contraseña"
      description="Por seguridad, se cerrarán tus otras sesiones."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <TextField
            control={form.control}
            name="password"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
          />
          <TextField
            control={form.control}
            name="confirm"
            label="Repite la contraseña"
            type="password"
            autoComplete="new-password"
          />
          <SubmitButton pending={form.formState.isSubmitting} className="w-full" size="lg">
            guardar contraseña
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
