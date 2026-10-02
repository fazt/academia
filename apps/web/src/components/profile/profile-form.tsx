"use client";

import { type ProfileInput, profileInputSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SubmitButton, TextareaField, TextField } from "@/components/form/fields";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Información personal</CardTitle>
        <CardDescription>Tu nombre aparece en tus comentarios, reseñas y certificados.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <CardContent>
          <FieldGroup>
            <TextField control={form.control} name="name" label="Nombre completo" autoComplete="name" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Email</p>
              <p className="rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm text-muted-foreground">{email}</p>
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
        </CardContent>
        <CardFooter className="mt-6 justify-end">
          <SubmitButton pending={mutation.isPending} disabled={!form.formState.isDirty}>
            Guardar cambios
          </SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
