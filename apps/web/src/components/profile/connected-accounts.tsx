"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  type EnabledProviders,
  SOCIAL_PROVIDERS,
  type SocialProviderId,
  useRedirectPending,
} from "@/components/auth/social-sign-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, oauthErrorMessage } from "@/lib/auth-errors";

export function ConnectedAccounts({
  accounts,
  enabled,
}: {
  /** Cuentas de Better Auth del usuario: "credential" (contraseña) y una por proveedor. */
  accounts: { id: string; providerId: string }[];
  enabled: EnabledProviders | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useRedirectPending();

  // Al volver del proveedor: ?conectado=<proveedor> o ?error=<código>. Se avisa y se limpia la URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const linked = SOCIAL_PROVIDERS.find((p) => p.id === params.get("conectado"));
    if (!error && !linked) return;
    if (error) toast.error(oauthErrorMessage(error), { id: "social-link" });
    else toast.success(`${linked!.name} conectado. Ya puedes entrar con él.`, { id: "social-link" });
    router.replace("/perfil", { scroll: false });
  }, [router]);

  // Se muestran los proveedores configurados y los que el usuario ya tiene conectados.
  const rows = SOCIAL_PROVIDERS.map((p) => ({ ...p, account: accounts.find((a) => a.providerId === p.id) })).filter(
    (p) => enabled?.[p.id] || p.account,
  );
  if (!rows.length) return null;
  // Better Auth no deja quitar el último método de acceso.
  const onlyAccess = accounts.length <= 1;

  const connect = async (provider: SocialProviderId) => {
    setPending(provider);
    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: `/perfil?conectado=${provider}`,
      errorCallbackURL: "/perfil",
    });
    if (error) {
      setPending(null);
      toast.error(authErrorMessage(error));
    }
  };

  const disconnect = async (provider: SocialProviderId, name: string, accountId: string) => {
    setPending(provider);
    const { error } = await authClient.unlinkAccount({ accountId });
    setPending(null);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    toast.success(`${name} desconectado`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Cuentas conectadas</CardTitle>
        <CardDescription>Entra con un clic, sin escribir tu contraseña.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(({ id, name, Icon, account }) => (
          <div key={id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-muted">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">
                {!account
                  ? "No conectada"
                  : onlyAccess
                    ? "Es tu único acceso: crea una contraseña para poder desconectarla."
                    : "Conectada"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (account ? disconnect(id, name, account.id) : connect(id))}
              disabled={pending !== null || (!!account && onlyAccess)}
            >
              {pending === id && <Spinner />}
              {account ? "Desconectar" : "Conectar"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
