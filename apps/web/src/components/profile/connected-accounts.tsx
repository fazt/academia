"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { GoogleIcon, useRedirectPending } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, oauthErrorMessage } from "@/lib/auth-errors";

export function ConnectedAccounts({
  accounts,
  hasPassword,
}: {
  accounts: { id: string; providerId: string }[];
  hasPassword: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [pending, setPending] = useRedirectPending();
  const google = accounts.find((a) => a.providerId === "google");

  // Si falla la conexión, Better Auth vuelve a /perfil con ?error=<código>.
  const linkError = params.get("error");
  useEffect(() => {
    if (!linkError) return;
    toast.error(oauthErrorMessage(linkError), { id: "google-link-error" });
    router.replace("/perfil", { scroll: false });
  }, [linkError, router]);

  const connect = async () => {
    setPending(true);
    const { error } = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/perfil",
      errorCallbackURL: "/perfil",
    });
    if (error) {
      setPending(false);
      toast.error(authErrorMessage(error));
    }
  };

  const disconnect = async () => {
    if (!google) return;
    setPending(true);
    const { error } = await authClient.unlinkAccount({ accountId: google.id });
    setPending(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    toast.success("Desconectamos tu cuenta de Google");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Cuentas conectadas</CardTitle>
        <CardDescription>Entra con Google sin escribir tu contraseña.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <GoogleIcon className="size-5 shrink-0" />
            <div>
              <p className="font-medium">Google</p>
              <p className="text-muted-foreground">{google ? "Conectada" : "No conectada"}</p>
            </div>
          </div>
          {google ? (
            <Button variant="outline" onClick={disconnect} disabled={pending || !hasPassword}>
              {pending && <Spinner />}
              Desconectar
            </Button>
          ) : (
            <Button variant="outline" onClick={connect} disabled={pending}>
              {pending && <Spinner />}
              Conectar
            </Button>
          )}
        </div>
        {google && !hasPassword && (
          <p className="text-muted-foreground">
            Google es tu único método de acceso. Crea una contraseña para poder desconectarla.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
