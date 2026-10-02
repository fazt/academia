"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export function MicrosoftIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 23 23" aria-hidden="true" {...props}>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

/** Inicia sesión con Microsoft (o crea la cuenta si no existe) y vuelve a `redirectTo`. */
export function MicrosoftButton({ redirectTo }: { redirectTo: string }) {
  const [pending, setPending] = useState(false);

  // Si el usuario vuelve con el botón Atrás, el navegador restaura la página desde la caché
  // (bfcache) con el botón aún deshabilitado: hay que reactivarlo.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const onClick = async () => {
    setPending(true);
    const { error } = await signIn.social({
      provider: "microsoft",
      callbackURL: redirectTo,
      // Better Auth añade ?error=<código> y el formulario de login lo traduce.
      errorCallbackURL: `/login?redirect=${encodeURIComponent(redirectTo)}`,
    });
    // Si todo va bien el navegador ya está yendo a Microsoft: el botón sigue deshabilitado.
    if (error) {
      setPending(false);
      toast.error(authErrorMessage(error));
    }
  };

  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={onClick} disabled={pending}>
      {pending ? <Spinner /> : <MicrosoftIcon className="size-4" />}
      Continuar con Microsoft
    </Button>
  );
}
