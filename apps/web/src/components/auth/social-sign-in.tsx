"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export function GoogleIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Logo de GitHub (lucide ya no incluye marcas). */
export function GithubIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

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

export type SocialProviderId = "google" | "github" | "microsoft";

/** Respuesta de GET /api/auth-providers: qué proveedores están configurados en la API. */
export type EnabledProviders = Partial<Record<SocialProviderId, boolean>>;

export const SOCIAL_PROVIDERS: {
  id: SocialProviderId;
  name: string;
  Icon: (props: React.ComponentProps<"svg">) => React.ReactNode;
}[] = [
  { id: "google", name: "Google", Icon: GoogleIcon },
  { id: "github", name: "GitHub", Icon: GithubIcon },
  { id: "microsoft", name: "Microsoft", Icon: MicrosoftIcon },
];

/**
 * Proveedor al que se está redirigiendo. Si el usuario vuelve con el botón Atrás, el navegador
 * restaura la página desde la caché (bfcache) con los botones aún bloqueados: se liberan al volver.
 */
export function useRedirectPending() {
  const [pending, setPending] = useState<SocialProviderId | null>(null);
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return [pending, setPending] as const;
}

/**
 * "Continuar con …" de cada proveedor configurado y el separador del formulario de email. Sirve
 * para entrar y para registrarse: si la cuenta no existe, Better Auth la crea.
 */
export function SocialSignIn({ enabled, redirectTo }: { enabled: EnabledProviders | null; redirectTo: string }) {
  const [pending, setPending] = useRedirectPending();
  const providers = SOCIAL_PROVIDERS.filter((p) => enabled?.[p.id]);
  if (!providers.length) return null;

  const start = async (provider: SocialProviderId) => {
    setPending(provider);
    const { error } = await signIn.social({
      provider,
      callbackURL: redirectTo,
      // Better Auth añade ?error=<código> y el formulario de login lo traduce.
      errorCallbackURL: `/login?${new URLSearchParams({ redirect: redirectTo })}`,
    });
    // Sin error el navegador ya va camino del proveedor: los botones siguen bloqueados.
    if (error) {
      setPending(null);
      toast.error(authErrorMessage(error));
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {providers.map(({ id, name, Icon }) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pending !== null}
            onClick={() => start(id)}
          >
            {pending === id ? <Spinner /> : <Icon className="size-4" />}
            continuar con {name}
          </Button>
        ))}
      </div>
      <FieldSeparator className="font-term text-xs *:data-[slot=field-separator-content]:bg-term-surface">o con tu email</FieldSeparator>
    </>
  );
}
