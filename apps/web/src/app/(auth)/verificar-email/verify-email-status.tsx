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
import { cn } from "@/lib/utils";

function Status({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode;
  tone: "accent" | "ok" | "danger";
  children: React.ReactNode;
}) {
  const tones = {
    accent: "text-term-accent",
    ok: "text-term-ok",
    danger: "text-destructive",
  };
  return (
    <div className="flex gap-3 text-sm text-term-muted">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[10px] border border-term-border bg-term-raised [&_svg]:size-5",
          tones[tone],
        )}
      >
        {icon}
      </span>
      <div className="flex flex-col items-start gap-4">{children}</div>
    </div>
  );
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
      <AuthCard file="verificar-email.sh" title="Confirma tu email">
        <Status tone="accent" icon={<MailCheck />}>
          <p>
            Te enviamos un enlace de confirmación
            {email ? (
              <>
                {" "}
                a <strong className="font-term font-medium text-term-text">{email}</strong>
              </>
            ) : null}
            . Ábrelo para activar tu cuenta.
          </p>
          {email && (
            <Button variant="outline" onClick={resend} disabled={resending}>
              reenviar enlace
            </Button>
          )}
        </Status>
      </AuthCard>
    );
  }

  if (error) {
    return (
      <AuthCard file="verificar-email.sh" title="No pudimos confirmar tu email">
        <Status tone="danger" icon={<CircleX />}>
          <p>{authErrorMessage({ code: error.toUpperCase() })}. Inicia sesión para recibir un enlace nuevo.</p>
          <Button asChild>
            <Link href="/login">ir a iniciar sesión</Link>
          </Button>
        </Status>
      </AuthCard>
    );
  }

  return (
    <AuthCard file="verificar-email.sh" title="¡Email confirmado!">
      <Status tone="ok" icon={<CircleCheck />}>
        <p>Tu cuenta está activa. Ya puedes empezar a aprender.</p>
        <Button asChild>
          <Link href={session ? "/mis-cursos" : "/login"}>{session ? "ir a mis cursos →" : "iniciar sesión"}</Link>
        </Button>
      </Status>
    </AuthCard>
  );
}
