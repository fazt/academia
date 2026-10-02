"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { GithubIcon, useRedirectPending } from "@/components/auth/github-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, oauthErrorMessage } from "@/lib/auth-errors";

export function ConnectedAccounts({
  githubAccountId,
  hasPassword,
}: {
  /** Id de la cuenta de GitHub en Better Auth (no el de GitHub), o null si no está conectada. */
  githubAccountId: string | null;
  hasPassword: boolean;
}) {
  const githubLinked = githubAccountId !== null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useRedirectPending();

  // Al volver de GitHub: ?github=conectado o ?error=<código>. Se avisa y se limpia la URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (!error && !params.has("github")) return;
    if (error) toast.error(oauthErrorMessage(error), { id: "github-link" });
    else toast.success("GitHub conectado. Ya puedes entrar con él.", { id: "github-link" });
    router.replace("/perfil", { scroll: false });
  }, [router]);

  const connect = async () => {
    setPending(true);
    const { error } = await authClient.linkSocial({
      provider: "github",
      callbackURL: "/perfil?github=conectado",
      errorCallbackURL: "/perfil",
    });
    if (error) {
      setPending(false);
      toast.error(authErrorMessage(error));
    }
  };

  const disconnect = async () => {
    if (!githubAccountId) return;
    setPending(true);
    const { error } = await authClient.unlinkAccount({ accountId: githubAccountId });
    if (error) {
      setPending(false);
      toast.error(authErrorMessage(error));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["auth-accounts"] });
    setPending(false);
    toast.success("GitHub desconectado");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Cuentas conectadas</CardTitle>
        <CardDescription>Entra con un clic, sin escribir tu contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-muted">
            <GithubIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">GitHub</p>
            <p className="text-sm text-muted-foreground">
              {!githubLinked
                ? "No conectada"
                : hasPassword
                  ? "Conectada"
                  : "Es tu único acceso: crea una contraseña para poder desconectarla."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={githubLinked ? disconnect : connect}
            disabled={pending || (githubLinked && !hasPassword)}
          >
            {pending && <Spinner />}
            {githubLinked ? "Desconectar" : "Conectar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
