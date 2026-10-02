"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api, call } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

/** Cursos en los que el usuario está inscrito (personaliza las páginas públicas). */
export function useLibrary() {
  const { data: session } = useSession();
  const query = useQuery({
    queryKey: ["library", session?.user.id],
    queryFn: () => call(api.me.library.$get()),
    enabled: !!session,
  });
  const enrolled = useMemo(() => new Set(query.data?.enrolledCourseIds ?? []), [query.data]);
  return { enrolled, isLoading: !!session && query.isLoading };
}
