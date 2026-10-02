"use client";

import { CircleCheck, CircleX, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { authClient, useSession } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

function StatusIcon({ children, tone }: { children: React.ReactNode; tone: "primary" | "success" | "danger" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    danger: "bg-destructive/10 text-destructive",
  };
  return <div className={`mx-auto grid size-12 place-items-center rounded-full ${tones[tone]}`}>{children}</div>;
}

export function VerifyEmailStatus() {
  const params = useSearchParams();
  const { data: session } = useSession();
  const [resending, setResending] = useState(false);
  const email = params.get("email");
  const error = params.get("error");

  const resend = async () => {
    if (!email) return;
    setResending(true);
    const { error: resendError } = await authClient.sendVerificationEmail({ email, callbackURL: "/verificar-email" });
    setResending(false);
    if (resendError) toast.error(authErrorMessage(resendError));
    else toast.success("Te enviamos un nuevo enlace");
  };

  // Recién registrado: aún no ha hecho clic en el enlace.
  if (params.get("enviado")) {
    return (
      <AuthCard title="Confirma tu email">
        <div className="space-y-4 text-center text-sm text-muted-foreground">
          <StatusIcon tone="primary">
            <MailCheck className="size-6" />
          </StatusIcon>
          <p>
            Te enviamos un enlace de confirmación{email ? <> a <strong className="text-foreground">{email}</strong></> : null}.
            Ábrelo para activar tu cuenta.
          </p>
          {email && (
            <Button variant="outline" onClick={resend} disabled={resending}>
              Reenviar enlace
            </Button>
          )}
        </div>
      </AuthCard>
    );
  }

  if (error) {
    return (
      <AuthCard title="No pudimos confirmar tu email">
        <div className="space-y-4 text-center text-sm text-muted-foreground">
          <StatusIcon tone="danger">
            <CircleX className="size-6" />
          </StatusIcon>
          <p>{authErrorMessage({ code: error.toUpperCase() })}. Inicia sesión para recibir un enlace nuevo.</p>
          <Button asChild>
            <Link href="/login">Ir a iniciar sesión</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="¡Email confirmado!">
      <div className="space-y-4 text-center text-sm text-muted-foreground">
        <StatusIcon tone="success">
          <CircleCheck className="size-6" />
        </StatusIcon>
        <p>Tu cuenta está activa. Ya puedes empezar a aprender.</p>
        <Button asChild>
          <Link href={session ? "/mis-cursos" : "/login"}>{session ? "Ir a mis cursos" : "Iniciar sesión"}</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
