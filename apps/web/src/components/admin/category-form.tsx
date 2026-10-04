"use client";

import { type CategoryInput, categoryInputSchema, slugify } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { applyServerErrors } from "@/components/admin/form-errors";
import { SubmitButton } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, call } from "@/lib/api";

/** Formulario reutilizable para crear y editar categorías. */
export function CategoryForm({ categoryId, initial }: { categoryId?: string; initial?: CategoryInput }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!categoryId;
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: initial ?? { name: "", slug: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await call(api.admin.categories[":id"].$put({ param: { id: categoryId }, json: values }));
        toast.success("Categoría guardada");
      } else {
        await call(api.admin.categories.$post({ json: values }));
        toast.success("Categoría creada");
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "categories"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "options"] }),
      ]);
      router.push("/admin/categorias");
    } catch (error) {
      applyServerErrors(error, form.setError, "slug");
    }
  });

  return (
    <Card className="max-w-xl">
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">Nombre</FieldLabel>
                  <Input
                    {...field}
                    id="name"
                    autoFocus
                    placeholder="Ej.: Desarrollo Web"
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => {
                      field.onChange(event);
                      if (!slugTouched) form.setValue("slug", slugify(event.target.value));
                    }}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="slug"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="slug">Slug</FieldLabel>
                  <Input
                    {...field}
                    id="slug"
                    aria-invalid={fieldState.invalid}
                    className="font-term"
                    onChange={(event) => {
                      setSlugTouched(true);
                      field.onChange(event.target.value.toLowerCase());
                    }}
                  />
                  <FieldDescription>Se usa en los filtros del catálogo: /cursos?category={field.value || "slug"}</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 justify-end gap-2 border-t">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/categorias")}>
            cancelar
          </Button>
          <SubmitButton pending={form.formState.isSubmitting}>{isEdit ? "guardar cambios" : "crear categoría"}</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
