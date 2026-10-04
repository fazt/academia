"use client";

import { useQuery } from "@tanstack/react-query";
import { Container, PageHeader } from "@/components/layout/page-header";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ConnectedAccounts } from "@/components/profile/connected-accounts";
import { PasswordForm } from "@/components/profile/password-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call, errorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => call(api.me.$get()),
  });
  // Métodos de acceso del usuario: "credential" (contraseña) y uno por proveedor conectado.
  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) throw new Error(error.message ?? "No se pudieron cargar tus métodos de acceso");
      return data;
    },
  });
  const providers = useQuery({
    queryKey: ["auth-providers"],
    queryFn: () => call(api["auth-providers"].$get()),
    staleTime: Infinity,
  });
  // Si las cuentas no cargan se asume contraseña: es el caso de casi todos los usuarios.
  const hasPassword = accounts.data?.some((a) => a.providerId === "credential") ?? true;

  return (
    <Container className="flex flex-col gap-10 py-12">
      <PageHeader
        command="whoami"
        title="Perfil"
        description={profile ? `Miembro desde ${formatDate(profile.createdAt)}` : "Gestiona tu cuenta."}
      />
      <div className="max-w-[860px]">
        {isLoading || accounts.isLoading ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-40 w-full rounded-[14px]" />
            <Skeleton className="h-96 w-full rounded-[14px]" />
            <Skeleton className="h-80 w-full rounded-[14px]" />
          </div>
        ) : error || !profile ? (
          <Empty className="rounded-[14px] border border-term-border">
            <EmptyHeader>
              <EmptyTitle>No se pudo cargar tu perfil</EmptyTitle>
              <EmptyDescription>{errorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-6">
            <AvatarUploader name={profile.name} image={profile.image} />
            <ProfileForm
              key={profile.id}
              email={profile.email}
              initial={{ name: profile.name, headline: profile.headline, bio: profile.bio }}
            />
            {accounts.data && <ConnectedAccounts accounts={accounts.data} enabled={providers.data ?? null} />}
            <PasswordForm hasPassword={hasPassword} email={profile.email} />
          </div>
        )}
      </div>
    </Container>
  );
}
