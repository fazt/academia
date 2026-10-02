import { COURSE_LEVEL_LABELS } from "@academia/shared";
import Link from "next/link";
import { SectionTitle, TermSection } from "@/components/landing/section-title";
import { formatDuration, formatPrice } from "@/lib/format";
import type { CourseCardData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CourseList({ courses, total }: { courses: CourseCardData[]; total: number }) {
  return (
    <TermSection id="cursos">
      <SectionTitle command="ls cursos/" aside="vista previa gratis en todos los cursos" />
      {courses.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-term-border-strong p-10 text-center text-term-muted">
          Pronto publicaremos los primeros cursos.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const free = course.priceCents === 0;
            return (
              <Link
                key={course.id}
                href={`/cursos/${course.slug}`}
                className={cn(
                  "group flex min-w-0 flex-col gap-3 rounded-[14px] border bg-term-surface p-6 transition-colors hover:bg-term-raised focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none",
                  free ? "border-term-accent" : "border-term-border hover:border-term-border-strong",
                )}
              >
                <span className="truncate font-term text-sm text-term-muted">
                  {course.slug}
                  <span className="text-term-accent">/</span>
                </span>
                <h3 className="text-[21px] leading-snug font-semibold">{course.title}</h3>
                <span className="font-term text-[13px] text-term-muted">
                  {course.chaptersCount} clases · {formatDuration(course.durationSec)} ·{" "}
                  {COURSE_LEVEL_LABELS[course.level].toLowerCase()}
                </span>
                <span className="mt-auto flex items-baseline justify-between pt-3 font-term">
                  <span className={cn("text-[19px] font-extrabold", free && "text-term-accent")}>
                    {free ? "gratis" : formatPrice(course.priceCents, course.currency)}
                  </span>
                  <span className="text-[13px] text-term-accent group-hover:underline">
                    {free ? "empezar ahora →" : "ver temario →"}
                  </span>
                </span>
              </Link>
            );
          })}
          <Link
            href="/cursos"
            className="flex min-h-[220px] flex-col justify-center gap-2.5 rounded-[14px] border border-dashed border-term-border-strong p-6 transition-colors hover:border-term-accent focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none"
          >
            <span className="font-term text-sm text-term-muted">ls cursos/ --all</span>
            <span className="text-[21px] leading-snug font-semibold">
              Ver el catálogo completo{total > courses.length ? ` (${total} cursos)` : ""}
            </span>
            <span className="font-term text-[13px] text-term-accent">buscar y filtrar →</span>
          </Link>
        </div>
      )}
    </TermSection>
  );
}
