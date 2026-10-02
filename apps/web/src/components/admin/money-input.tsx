"use client";

import { useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";

function centsToText(cents: number | null | undefined) {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

/** Convierte "12,5" o "12.50" en céntimos. Devuelve NaN si no es un número. */
export function textToCents(text: string) {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") return Number.NaN;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return Number.NaN;
  return Math.round(Number.parseFloat(normalized) * 100);
}

/**
 * Campo de importe: se edita en unidades mayores (12,50) y emite céntimos (1250).
 */
export function MoneyInput({
  id,
  value,
  onChange,
  onBlur,
  currency,
  invalid,
  placeholder = "0",
}: {
  id?: string;
  value: number | null | undefined;
  onChange: (cents: number) => void;
  onBlur?: () => void;
  currency: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => centsToText(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Sincroniza cuando el valor cambia desde fuera (reset del formulario), sin pisar lo que se escribe.
  if (!Object.is(value, syncedValue)) {
    setSyncedValue(value);
    if (!Object.is(textToCents(text), value ?? Number.NaN)) setText(centsToText(value));
  }

  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        aria-invalid={invalid}
        onBlur={onBlur}
        onChange={(event) => {
          setText(event.target.value);
          onChange(textToCents(event.target.value));
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{currency}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
