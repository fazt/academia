"use client";

import { useQuery } from "@tanstack/react-query";
import { Container, PageHeader } from "@/components/layout/page-header";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { PasswordForm } from "@/components/profile/password-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => call(api.me.$get()),
  });

  return (
    <Container className="max-w-3xl space-y-8 py-10">
      <PageHeader
        title="Perfil"
        description={profile ? `Miembro desde ${formatDate(profile.createdAt)}` : "Gestiona tu cuenta."}
      />
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : error || !profile ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No se pudo cargar tu perfil</EmptyTitle>
            <EmptyDescription>{errorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-6">
          <AvatarUploader name={profile.name} image={profile.image} />
          <ProfileForm
            key={profile.id}
            email={profile.email}
            initial={{ name: profile.name, headline: profile.headline, bio: profile.bio }}
          />
          <PasswordForm />
        </div>
      )}
    </Container>
  );
}
