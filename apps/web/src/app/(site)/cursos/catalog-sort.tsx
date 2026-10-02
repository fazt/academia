"use client";

import { COURSE_SORT_LABELS, COURSE_SORTS, type CourseSort } from "@academia/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CatalogSort({ value }: { value: CourseSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <Select
      value={value}
      onValueChange={(sort) => {
        const next = new URLSearchParams(params.toString());
        next.set("sort", sort);
        next.delete("page");
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      <SelectTrigger className="w-56" aria-label="Ordenar por">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {COURSE_SORTS.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {COURSE_SORT_LABELS[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
