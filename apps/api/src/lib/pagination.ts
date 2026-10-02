import { type SQL, asc, desc } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function paginate<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export const offsetOf = (page: number, pageSize: number) => (page - 1) * pageSize;

/** Orden seguro: solo admite columnas de la lista blanca. */
export function orderByFrom(
  columns: Record<string, AnyPgColumn | SQL>,
  sort: string | undefined,
  order: "asc" | "desc" | undefined,
  fallback: SQL,
): SQL {
  const column = sort ? columns[sort] : undefined;
  if (!column) return fallback;
  return order === "asc" ? asc(column) : desc(column);
}

/** Escapa los comodines de LIKE en la búsqueda del usuario. */
export const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
