"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

/** Editor de una lista de textos cortos (lo que aprenderás, requisitos). */
export function ListEditor({
  id,
  value,
  onChange,
  placeholder,
  max = 20,
  invalid,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  max?: number;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text || value.length >= max) return;
    onChange([...value, text]);
    setDraft("");
  };

  const move = (index: number, delta: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((item, index) => (
            <li key={`${index}-${item}`} className="flex items-center gap-1 rounded-[10px] border border-term-border bg-term-bg py-1 pr-1 pl-3 text-sm">
              <span className="min-w-0 flex-1 break-words">
                <span className="mr-2 font-term text-term-accent" aria-hidden>
                  ›
                </span>
                {item}
              </span>
              <Button type="button" variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir">
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Bajar"
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Quitar «${item}»`}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <InputGroup>
        <InputGroupInput
          id={id}
          value={draft}
          maxLength={200}
          placeholder={value.length >= max ? `Máximo ${max} elementos` : placeholder}
          disabled={value.length >= max}
          aria-invalid={invalid}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="xs" onClick={add} disabled={!draft.trim() || value.length >= max}>
            <Plus /> añadir
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
