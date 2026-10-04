"use client";

import { couponInputSchema } from "@academia/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { applyServerErrors } from "@/components/admin/form-errors";
import { MoneyInput } from "@/components/admin/money-input";
import { useAdminOptions } from "@/components/admin/use-admin-options";
import { SubmitButton } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, call } from "@/lib/api";

type CouponFormInput = z.input<typeof couponInputSchema>;
type CouponFormOutput = z.output<typeof couponInputSchema>;

/** ISO -> valor de <input type="datetime-local"> en hora local. */
function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Formulario reutilizable para crear y editar cupones. */
export function CouponForm({
  couponId,
  initial,
  redemptionsCount,
}: {
  couponId?: string;
  initial?: CouponFormInput;
  redemptionsCount?: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const options = useAdminOptions();
  const isEdit = !!couponId;
  const [courseFilter, setCourseFilter] = useState("");

  const form = useForm<CouponFormInput, unknown, CouponFormOutput>({
    resolver: zodResolver(couponInputSchema),
    defaultValues: initial ?? {
      code: "",
      type: "percent",
      value: 10,
      appliesToAll: true,
      courseIds: [],
      maxRedemptions: null,
      expiresAt: null,
      active: true,
    },
  });

  const type = useWatch({ control: form.control, name: "type" });
  const appliesToAll = useWatch({ control: form.control, name: "appliesToAll" });
  const currency = options.data?.currency ?? "USD";

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await call(api.admin.coupons[":id"].$put({ param: { id: couponId }, json: values }));
        toast.success("Cupón guardado");
      } else {
        await call(api.admin.coupons.$post({ json: values }));
        toast.success("Cupón creado");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "coupon"] });
      router.push("/admin/cupones");
    } catch (error) {
      applyServerErrors(error, form.setError, "code");
    }
  });

  if (options.isLoading) return <Skeleton className="h-[520px] w-full max-w-3xl rounded-xl" />;

  const courses = (options.data?.courses ?? []).filter((c) =>
    c.title.toLowerCase().includes(courseFilter.trim().toLowerCase()),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Descuento</CardTitle>
          <CardDescription>El alumno escribe el código en el carrito antes de pagar.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller
              control={form.control}
              name="code"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="code">Código</FieldLabel>
                  <Input
                    {...field}
                    id="code"
                    autoFocus={!isEdit}
                    placeholder="BIENVENIDA20"
                    className="font-mono uppercase"
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => field.onChange(event.target.value.toUpperCase().replace(/\s/g, ""))}
                  />
                  <FieldDescription>Letras, números, guiones y guiones bajos.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <FieldSet>
                  <FieldLegend variant="label">Tipo</FieldLegend>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(next) => {
                      if (next === field.value) return;
                      field.onChange(next);
                      // El valor cambia de significado (% o céntimos): se propone uno razonable.
                      form.setValue("value", next === "percent" ? 10 : 1000, { shouldValidate: form.formState.isSubmitted });
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {[
                      { value: "percent", label: "Porcentaje", hint: "Ej.: 20 %" },
                      { value: "amount", label: "Importe fijo", hint: `Ej.: 10 ${currency}` },
                    ].map((option) => (
                      <FieldLabel key={option.value} htmlFor={`type-${option.value}`}>
                        <Field orientation="horizontal">
                          <RadioGroupItem value={option.value} id={`type-${option.value}`} />
                          <FieldContent>
                            <span className="font-medium">{option.label}</span>
                            <FieldDescription>{option.hint}</FieldDescription>
                          </FieldContent>
                        </Field>
                      </FieldLabel>
                    ))}
                  </RadioGroup>
                </FieldSet>
              )}
            />
            <Controller
              control={form.control}
              name="value"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="value">{type === "percent" ? "Porcentaje de descuento" : "Importe de descuento"}</FieldLabel>
                  {type === "percent" ? (
                    <InputGroup>
                      <InputGroupInput
                        id="value"
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={Number.isNaN(field.value) ? "" : field.value}
                        aria-invalid={fieldState.invalid}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>%</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  ) : (
                    <MoneyInput
                      id="value"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      currency={currency}
                      invalid={fieldState.invalid}
                    />
                  )}
                  {type === "amount" && (
                    <FieldDescription>Se reparte entre los cursos a los que aplica; nunca deja un total negativo.</FieldDescription>
                  )}
                  {fieldState.invalid && (
                    <FieldError>{Number.isNaN(field.value) ? "Escribe un valor válido" : fieldState.error?.message}</FieldError>
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="active"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="active">Activo</FieldLabel>
                    <FieldDescription>Desactívalo para pausarlo sin borrarlo.</FieldDescription>
                  </FieldContent>
                  <Switch id="active" checked={field.value} onCheckedChange={field.onChange} />
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Límites</CardTitle>
            {isEdit && (
              <CardDescription>
                Usado {redemptionsCount ?? 0} {redemptionsCount === 1 ? "vez" : "veces"} (incluye pagos pendientes).
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="maxRedemptions"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="maxRedemptions">Usos máximos</FieldLabel>
                    <Input
                      id="maxRedemptions"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Ilimitado"
                      value={field.value ?? ""}
                      aria-invalid={fieldState.invalid}
                      onBlur={field.onBlur}
                      onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))}
                    />
                    <FieldDescription>Déjalo vacío para usos ilimitados.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="expiresAt"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="expiresAt">Caduca</FieldLabel>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={isoToLocalInput(field.value)}
                      aria-invalid={fieldState.invalid}
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        field.onChange(event.target.value ? new Date(event.target.value).toISOString() : null)
                      }
                    />
                    <FieldDescription>Vacío para que no caduque. Hora local.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                control={form.control}
                name="appliesToAll"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="appliesToAll">Aplica a todos los cursos</FieldLabel>
                      <FieldDescription>Incluye los cursos que publiques más adelante.</FieldDescription>
                    </FieldContent>
                    <Switch id="appliesToAll" checked={field.value} onCheckedChange={field.onChange} />
                  </Field>
                )}
              />
              {!appliesToAll && (
                <Controller
                  control={form.control}
                  name="courseIds"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="course-filter">Elige los cursos ({field.value.length})</FieldLabel>
                      <Input
                        id="course-filter"
                        value={courseFilter}
                        onChange={(event) => setCourseFilter(event.target.value)}
                        placeholder="Filtrar cursos…"
                      />
                      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                        {courses.length === 0 && <p className="p-2 text-sm text-muted-foreground">Sin cursos.</p>}
                        {courses.map((course) => {
                          const checked = field.value.includes(course.id);
                          return (
                            <label
                              key={course.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  field.onChange(
                                    value ? [...field.value, course.id] : field.value.filter((id) => id !== course.id),
                                  )
                                }
                              />
                              <span className="min-w-0 truncate">{course.title}</span>
                            </label>
                          );
                        })}
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/cupones")}>
              cancelar
            </Button>
            <SubmitButton pending={form.formState.isSubmitting}>{isEdit ? "guardar cambios" : "crear cupón"}</SubmitButton>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
