"use client";

import { useQuery } from "@tanstack/react-query";
import { api, call } from "@/lib/api";

/** Categorías, instructores, cursos y moneda para selects y filtros del panel. */
export function useAdminOptions() {
  return useQuery({
    queryKey: ["admin", "options"],
    queryFn: () => call(api.admin.courses.options.$get()),
    staleTime: 60_000,
  });
}
