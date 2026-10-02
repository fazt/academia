"use client";

import { type ReviewInput, reviewInputSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { SubmitButton, TextareaField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { api, call, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { learnQueryKey } from "./types";

const RATING_LABELS = ["", "Muy malo", "Malo", "Normal", "Bueno", "Excelente"];

function StarPicker({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Puntuación"
        aria-invalid={invalid}
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? "estrella" : "estrellas"}`}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(0)}
            onClick={() => onChange(star)}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Star
              className={cn("size-8 transition-colors", star <= shown ? "text-star" : "text-muted-foreground/30")}
              fill="currentColor"
              strokeWidth={0}
            />
          </button>
        ))}
      </div>
      <span className="text-sm font-medium text-muted-foreground">{RATING_LABELS[shown]}</span>
    </div>
  );
}

interface ReviewDialogProps {
  slug: string;
  courseId: string;
  initial: { rating: number; body: string } | null;
  trigger?: React.ReactNode;
}

export function ReviewDialog({ slug, courseId, initial, trigger }: ReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewInputSchema),
    defaultValues: { rating: initial?.rating ?? 0, body: initial?.body ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ReviewInput) => call(api.courses[":id"].review.$put({ param: { id: courseId }, json: values })),
    onSuccess: () => {
      toast.success(initial ? "Reseña actualizada" : "¡Gracias por tu reseña!");
      void queryClient.invalidateQueries({ queryKey: learnQueryKey(slug) });
      setOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset({ rating: initial?.rating ?? 0, body: initial?.body ?? "" });
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Star /> {initial ? "Editar reseña" : "Dejar reseña"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{initial ? "Edita tu reseña" : "¿Qué te está pareciendo el curso?"}</DialogTitle>
          <DialogDescription>Tu opinión ayuda a otros alumnos y al instructor a mejorar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
          <FieldGroup>
            <Controller
              control={form.control}
              name="rating"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Puntuación</FieldLabel>
                  <StarPicker value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <TextareaField
              control={form.control}
              name="body"
              label="Comentario (opcional)"
              rows={5}
              maxLength={3000}
              placeholder="¿Qué es lo que más te gustó? ¿Qué mejorarías?"
            />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton pending={mutation.isPending}>{initial ? "Guardar cambios" : "Publicar reseña"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
