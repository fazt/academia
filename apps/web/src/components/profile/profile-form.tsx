"use client";

import { type ProfileInput, profileInputSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SubmitButton, TextareaField, TextField } from "@/components/form/fields";
import { ProfileSection } from "@/components/profile/profile-section";
import { FieldGroup } from "@/components/ui/field";
import { api, call, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

export function ProfileForm({ initial, email }: { initial: ProfileInput; email: string }) {
  const queryClient = useQueryClient();
  const { refetch } = useSession();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: initial,
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileInput) => call(api.me.$patch({ json: values })),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile);
      form.reset({ name: profile.name, headline: profile.headline, bio: profile.bio });
      void refetch();
      toast.success("Perfil actualizado");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <ProfileSection
        file="perfil.json"
        title="Información personal"
        description="Tu nombre aparece en tus comentarios, reseñas y certificados."
        footer={
          <SubmitButton pending={mutation.isPending} disabled={!form.formState.isDirty}>
            guardar cambios
          </SubmitButton>
        }
      >
        <FieldGroup>
          <TextField control={form.control} name="name" label="Nombre completo" autoComplete="name" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Email</p>
            <p className="rounded-lg border border-term-border bg-term-raised px-2.5 py-1.5 font-term text-[13px] text-term-muted">
              {email}
            </p>
          </div>
          <TextField
            control={form.control}
            name="headline"
            label="Titular"
            placeholder="Ej.: Desarrolladora frontend"
            description="Una frase corta sobre ti (opcional)."
          />
          <TextareaField
            control={form.control}
            name="bio"
            label="Biografía"
            rows={4}
            placeholder="Cuéntanos algo sobre ti (opcional)"
          />
        </FieldGroup>
      </ProfileSection>
    </form>
  );
}
