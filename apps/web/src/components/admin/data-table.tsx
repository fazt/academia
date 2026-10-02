"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Copy, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PAGE_SIZES = ["10", "20", "50"];
const ALL = "__all__";

/**
 * Estado de la tabla (búsqueda, filtros, orden y página) guardado en la URL,
 * para que se pueda compartir, recargar y volver atrás sin perderlo.
 */
export function useTableParams<F extends string = never>(filterKeys: readonly F[] = []) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback((key: string) => searchParams.get(key) || undefined, [searchParams]);

  const page = Math.max(1, Number(get("page") ?? 1) || 1);
  const pageSize = PAGE_SIZES.includes(get("pageSize") ?? "") ? Number(get("pageSize")) : 10;
  const q = get("q");
  const sort = get("sort");
  const order = get("order") === "asc" ? ("asc" as const) : get("order") === "desc" ? ("desc" as const) : undefined;

  const filters = useMemo(
    () => Object.fromEntries(filterKeys.map((key) => [key, get(key)])) as Record<F, string | undefined>,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKeys es una constante del llamador
    [get],
  );

  const setParams = useCallback(
    (patch: Record<string, string | number | undefined | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      // Cualquier cambio que no sea de página vuelve a la primera.
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  /** Query base para la API (todos los valores como string). */
  const baseQuery = useMemo(
    () => ({
      page: String(page),
      pageSize: String(pageSize),
      ...(q ? { q } : {}),
      ...(sort ? { sort } : {}),
      ...(order ? { order } : {}),
    }),
    [page, pageSize, q, sort, order],
  );

  return { page, pageSize, q, sort, order, filters, setParams, baseQuery };
}

export type TableParams = ReturnType<typeof useTableParams<string>>;

/** Elimina las claves con valor undefined (la API no las espera). */
export function compact<T extends Record<string, string | undefined>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== "")) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

export function TableToolbar({
  table,
  placeholder = "Buscar…",
  children,
}: {
  table: Pick<TableParams, "q" | "setParams">;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const { setParams, q } = table;
  const [value, setValue] = useState(q ?? "");
  const [syncedQ, setSyncedQ] = useState(q);

  // Si la URL cambia desde fuera (atrás/adelante), el campo se actualiza.
  if (q !== syncedQ) {
    setSyncedQ(q);
    setValue(q ?? "");
  }

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === (q ?? "")) return;
    const id = setTimeout(() => setParams({ q: trimmed || undefined }), 350);
    return () => clearTimeout(id);
  }, [value, q, setParams]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label="Buscar"
        />
        {value && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="Limpiar búsqueda" onClick={() => setValue("")}>
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      {children}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "Todos",
  className,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className={cn("w-full sm:w-44", className)} aria-label={label}>
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SortableHead({
  table,
  column,
  children,
  className,
}: {
  table: Pick<TableParams, "sort" | "order" | "setParams">;
  column: string;
  children: React.ReactNode;
  className?: string;
}) {
  const active = table.sort === column;
  const Icon = !active ? ArrowUpDown : table.order === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (table.order === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        onClick={() =>
          table.setParams({ sort: column, order: active && table.order === "desc" ? "asc" : "desc" })
        }
      >
        {children}
        <Icon className={cn("size-3.5", !active && "opacity-40")} />
      </button>
    </TableHead>
  );
}

export function TablePagination({
  table,
  total,
  pageCount,
}: {
  table: Pick<TableParams, "page" | "pageSize" | "setParams">;
  total: number;
  pageCount: number;
}) {
  const from = total === 0 ? 0 : (table.page - 1) * table.pageSize + 1;
  const to = Math.min(total, table.page * table.pageSize);
  return (
    <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <p>
        {total === 0 ? "Sin resultados" : `Mostrando ${from}–${to} de ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Select value={String(table.pageSize)} onValueChange={(v) => table.setParams({ pageSize: v })}>
          <SelectTrigger size="sm" className="w-28" aria-label="Filas por página">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size} / pág.
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Página anterior"
          disabled={table.page <= 1}
          onClick={() => table.setParams({ page: table.page - 1 })}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-16 text-center tabular-nums">
          {table.page} / {Math.max(1, pageCount)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Página siguiente"
          disabled={table.page >= pageCount}
          onClick={() => table.setParams({ page: table.page + 1 })}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

/** Email con icono para copiarlo al portapapeles. */
export function CopyEmail({ email, className }: { email: string; className?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copiado", { description: email });
    } catch {
      toast.error("No se pudo copiar el email");
    }
  };
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1", className)}>
      <span className="truncate">{email}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void copy();
            }}
            aria-label={`Copiar ${email}`}
          >
            <Copy />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copiar email</TooltipContent>
      </Tooltip>
    </span>
  );
}

export function TableLoadingRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row}>
          {Array.from({ length: columns }, (_, col) => (
            <TableCell key={col}>
              <Skeleton className="h-4 w-full max-w-40" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function TableEmptyRow({
  columns,
  icon,
  title,
  description,
}: {
  columns: number;
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns}>
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            {description && <EmptyDescription>{description}</EmptyDescription>}
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  );
}

export function TableErrorRow({ columns, message, onRetry }: { columns: number; message: string; onRetry: () => void }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns} className="py-10 text-center">
        <p className="mb-3 text-sm text-destructive">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </TableCell>
    </TableRow>
  );
}
