import { COURSE_LEVEL_LABELS } from "@academia/shared";
import { Star } from "lucide-react";
import Link from "next/link";
import { formatDuration, formatPrice } from "@/lib/format";
import type { CourseCardData } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de curso de la portada, compartida con el catálogo: ruta del curso, título,
 * datos en monoespaciada y precio. Los cursos gratis llevan el borde del acento.
 * La imagen de portada solo aparece si el curso tiene una subida.
 */
export function CourseCard({ course, className }: { course: CourseCardData; className?: string }) {
  const free = course.priceCents === 0;
  return (
    <Link
      href={`/cursos/${course.slug}`}
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-[14px] border bg-term-surface transition-colors hover:bg-term-raised focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none",
        free ? "border-term-accent" : "border-term-border hover:border-term-border-strong",
        className,
      )}
    >
      {course.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- portadas en Spaces/CDN con dominio configurable
        <img src={course.coverImageUrl} alt="" loading="lazy" className="aspect-video w-full border-b border-term-border object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <span className="truncate font-term text-sm text-term-muted">
          {course.slug}
          <span className="text-term-accent">/</span>
        </span>
        <h3 className="text-[21px] leading-snug font-semibold">{course.title}</h3>
        <span className="font-term text-[13px] text-term-muted">
          {course.chaptersCount} clases · {formatDuration(course.durationSec)} ·{" "}
          {COURSE_LEVEL_LABELS[course.level].toLowerCase()}
          {course.ratingCount > 0 && (
            <>
              {" · "}
              <span className="inline-flex items-center gap-1 text-term-num">
                <Star aria-hidden className="size-3 fill-current" strokeWidth={0} />
                {course.ratingAvg.toFixed(1)}
              </span>
              <span className="sr-only"> de 5 estrellas,</span> ({course.ratingCount})
            </>
          )}
        </span>
        <span className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-3 font-term">
          <span className={cn("text-[19px] font-extrabold", free && "text-term-accent")}>
            {free ? "gratis" : formatPrice(course.priceCents, course.currency)}
          </span>
          <span className="text-[13px] text-term-accent group-hover:underline">
            {free ? "empezar ahora →" : "ver temario →"}
          </span>
        </span>
      </div>
    </Link>
  );
}

export function CourseGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-5 md:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}
