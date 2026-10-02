"use client";

import { type ChapterInput, chapterInputSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { applyServerErrors } from "@/components/admin/form-errors";
import { SubmitButton, TextareaField, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { api, call } from "@/lib/api";

type Target =
  | { mode: "create"; sectionId: string; sectionTitle: string }
  | { mode: "edit"; chapterId: string; values: ChapterInput };

const EMPTY: ChapterInput = { title: "", description: "", isFreePreview: false };

/** Crear o editar un capítulo. */
export function ChapterDialog({
  courseId,
  target,
  onOpenChange,
}: {
  courseId: string;
  target: Target | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<ChapterInput>({ resolver: zodResolver(chapterInputSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (target) form.reset(target.mode === "edit" ? target.values : EMPTY);
  }, [target, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!target) return;
    try {
      if (target.mode === "create") {
        await call(
          api.admin.courses[":id"].chapters.$post({
            param: { id: courseId },
            json: { ...values, sectionId: target.sectionId },
          }),
        );
        toast.success("Capítulo creado. Ahora súbele el video.");
      } else {
        await call(api.admin.chapters[":id"].$patch({ param: { id: target.chapterId }, json: values }));
        toast.success("Capítulo guardado");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] });
      onOpenChange(false);
    } catch (error) {
      applyServerErrors(error, form.setError);
    }
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{target?.mode === "edit" ? "Editar capítulo" : "Nuevo capítulo"}</DialogTitle>
            <DialogDescription>
              {target?.mode === "create"
                ? `Se añadirá al final de «${target.sectionTitle}».`
                : "Cambia el título, la descripción o la vista previa gratuita."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <TextField control={form.control} name="title" label="Título" placeholder="Ej.: Rutas dinámicas" autoFocus />
            <TextareaField
              control={form.control}
              name="description"
              label="Descripción"
              rows={4}
              placeholder="Qué se verá en esta clase (opcional)"
            />
            <Controller
              control={form.control}
              name="isFreePreview"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="isFreePreview">Vista previa gratuita</FieldLabel>
                    <FieldDescription>Cualquiera podrá ver este capítulo sin comprar el curso.</FieldDescription>
                  </FieldContent>
                  <Switch id="isFreePreview" checked={field.value} onCheckedChange={field.onChange} />
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={form.formState.isSubmitting}>
              {target?.mode === "edit" ? "Guardar" : "Crear capítulo"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type ChapterDialogTarget = Target;
