"use client";

import { COURSE_LEVEL_LABELS, COURSE_LEVELS, type CourseInput, courseInputSchema, slugify } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CoverUpload } from "@/components/admin/cover-upload";
import { applyServerErrors } from "@/components/admin/form-errors";
import { ListEditor } from "@/components/admin/list-editor";
import { MoneyInput } from "@/components/admin/money-input";
import { useAdminOptions } from "@/components/admin/use-admin-options";
import { SubmitButton, TextareaField, TextField } from "@/components/form/fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
];
const NO_CATEGORY = "__none__";

export function CourseForm({ courseId, initial }: { courseId?: string; initial?: CourseInput }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const options = useAdminOptions();
  const { data: session } = useSession();
  const isEdit = !!courseId;
  // En edición el slug ya existe: no se regenera al cambiar el título.
  const [slugTouched, setSlugTouched] = useState(isEdit);

  const form = useForm<CourseInput>({
    resolver: zodResolver(courseInputSchema),
    defaultValues: initial ?? {
      title: "",
      slug: "",
      subtitle: "",
      description: "",
      learningOutcomes: [],
      requirements: [],
      level: "beginner",
      language: "es",
      categoryId: null,
      instructorId: session?.user.id ?? "",
      coverImageUrl: null,
      priceCents: 0,
    },
  });

  const title = useWatch({ control: form.control, name: "title" });
  const currency = options.data?.currency ?? "USD";

  // Si el admin actual aún no estaba cargado al montar, se usa como instructor por defecto.
  const sessionUserId = session?.user.id;
  useEffect(() => {
    if (!isEdit && !form.getValues("instructorId") && sessionUserId) {
      form.setValue("instructorId", sessionUserId);
    }
  }, [isEdit, sessionUserId, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await call(api.admin.courses[":id"].$put({ param: { id: courseId }, json: values }));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "courses"] }),
          queryClient.invalidateQueries({ queryKey: ["admin", "options"] }),
        ]);
        form.reset(values);
        toast.success("Curso guardado");
      } else {
        const created = await call(api.admin.courses.$post({ json: values }));
        await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
        await queryClient.invalidateQueries({ queryKey: ["admin", "options"] });
        toast.success("Curso creado. Ahora añade secciones y capítulos.");
        router.push(`/admin/cursos/${created.id}?tab=curriculo`);
      }
    } catch (error) {
      applyServerErrors(error, form.setError, "slug");
    }
  });

  if (options.isLoading) {
    return <Skeleton className="h-[640px] w-full rounded-xl" />;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
            <CardDescription>Lo que verán los alumnos en el catálogo y en la página del curso.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="title">Título</FieldLabel>
                    <Input
                      {...field}
                      id="title"
                      aria-invalid={fieldState.invalid}
                      placeholder="Ej.: Next.js desde cero"
                      onChange={(event) => {
                        field.onChange(event);
                        if (!slugTouched) {
                          form.setValue("slug", slugify(event.target.value), { shouldValidate: form.formState.isSubmitted });
                        }
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
                    <FieldLabel htmlFor="slug">Slug (URL)</FieldLabel>
                    <InputGroup className="font-term">
                      <InputGroupAddon>
                        <InputGroupText>/cursos/</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="slug"
                        aria-invalid={fieldState.invalid}
                        className="pl-0.5!"
                        onChange={(event) => {
                          setSlugTouched(true);
                          field.onChange(event.target.value.toLowerCase());
                        }}
                      />
                    </InputGroup>
                    <FieldDescription>Se genera a partir del título. Solo minúsculas, números y guiones.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <TextField control={form.control} name="subtitle" label="Subtítulo" placeholder="Una frase que resuma el curso" />
              <TextareaField
                control={form.control}
                name="description"
                label="Descripción"
                rows={8}
                placeholder="Qué incluye el curso, para quién es, cómo está organizado…"
                description="Los saltos de línea se respetan en la página del curso."
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objetivos y requisitos</CardTitle>
            <CardDescription>Se muestran como listas en la página del curso.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="learningOutcomes"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="learningOutcomes">Lo que aprenderás</FieldLabel>
                    <ListEditor
                      id="learningOutcomes"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Ej.: Crear rutas dinámicas con el App Router"
                      invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="requirements"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="requirements">Requisitos</FieldLabel>
                    <ListEditor
                      id="requirements"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Ej.: Conocimientos básicos de JavaScript"
                      invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Portada</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={form.control}
              name="coverImageUrl"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <CoverUpload title={title} value={field.value} onChange={field.onChange} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="priceCents"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="priceCents">Precio</FieldLabel>
                    <MoneyInput
                      id="priceCents"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      currency={currency}
                      invalid={fieldState.invalid}
                    />
                    <FieldDescription>0 para un curso gratuito.</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError>
                        {Number.isNaN(field.value) ? "Escribe un importe válido (p. ej. 49,99)" : fieldState.error?.message}
                      </FieldError>
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="level"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="level">Nivel</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="level" className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COURSE_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {COURSE_LEVEL_LABELS[level]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="language"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="language">Idioma</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="language" className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="categoryId">Categoría</FieldLabel>
                    <Select
                      value={field.value ?? NO_CATEGORY}
                      onValueChange={(v) => field.onChange(v === NO_CATEGORY ? null : v)}
                    >
                      <SelectTrigger id="categoryId" className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                        {options.data?.categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="instructorId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="instructorId">Instructor</FieldLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="instructorId" className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Elige un instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.data?.instructors.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>Solo los administradores pueden ser instructores.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 lg:sticky lg:bottom-4">
          <SubmitButton pending={form.formState.isSubmitting} className="w-full" size="lg">
            {isEdit ? "guardar cambios" : "crear curso"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
