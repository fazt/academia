import { ArrowRight, Check, CirclePlay, Play } from "lucide-react";
import Link from "next/link";
import { formatClock, formatNumber } from "@/lib/format";
import type { CourseDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HeroProps {
  featured: CourseDetail | null;
  students: number;
  freeCourse: { title: string; slug: string } | null;
}

/** Mockup del aula con los primeros capítulos reales del curso destacado. */
function ClassroomMockup({ course }: { course: CourseDetail }) {
  const chapters = course.sections.flatMap((s) => s.chapters).filter((c) => c.hasVideo).slice(0, 4);
  const current = chapters[2];
  if (!current) return null;
  const done = 2;
  const percent = course.chaptersCount ? Math.round((done / course.chaptersCount) * 100) : 0;

  return (
    <div className="relative" aria-hidden>
      <div className="overflow-hidden rounded-2xl border border-term-border bg-term-surface shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
        <div className="relative grid aspect-video place-items-center bg-[#060807]">
          <span className="absolute top-4 left-[18px] font-term text-xs text-term-muted">
            {course.slug} / sección 1
          </span>
          <span className="grid size-[68px] place-items-center rounded-full bg-white/10">
            <Play className="size-7 fill-term-text text-term-text" />
          </span>
          <div className="absolute inset-x-[18px] bottom-3.5 flex flex-col gap-2">
            <div className="h-1 rounded bg-white/15">
              <div className="h-1 w-2/5 rounded bg-term-accent" />
            </div>
            <span className="font-term text-xs text-term-muted">
              {formatClock(current.durationSec * 0.4)} / {formatClock(current.durationSec)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1 px-[18px] pt-4 pb-[18px]">
          <div className="flex items-baseline justify-between pb-2">
            <span className="text-[15px] font-semibold">Contenido del curso</span>
            <span className="font-term text-xs text-term-muted">
              {done}/{course.chaptersCount} · {percent} %
            </span>
          </div>
          {chapters.map((chapter, index) => {
            const isDone = index < done;
            const isCurrent = index === done;
            return (
              <div
                key={chapter.id}
                className={cn(
                  "flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-sm",
                  isCurrent && "bg-[color-mix(in_oklch,var(--color-term-accent)_12%,var(--color-term-surface))] font-semibold",
                )}
              >
                {isDone ? (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-term-ok text-term-bg">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "size-5 shrink-0 rounded-full border-2",
                      isCurrent ? "border-term-accent" : "border-term-border-strong",
                    )}
                  />
                )}
                <span className={cn("flex-1 truncate", isCurrent && "text-term-accent")}>
                  {index + 1}. {chapter.title}
                </span>
                <span className="font-term text-xs font-normal text-term-muted">{formatClock(chapter.durationSec)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute -bottom-24 -left-7 hidden w-[280px] flex-col gap-2 rounded-[14px] border border-[#2f3531] bg-term-raised px-4 py-3.5 text-[13px] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)] sm:flex">
        <span className="font-term text-xs text-term-muted">preguntas/clase-3</span>
        <span className="font-semibold">¿Dónde descargo el código de esta clase?</span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-term-accent px-2 py-0.5 font-term text-[11px] font-bold text-term-bg">
            instructor
          </span>
          En la pestaña Recursos, debajo del video.
        </span>
      </div>
    </div>
  );
}

export function Hero({ featured, students, freeCourse }: HeroProps) {
  const hasPreview = !!featured?.sections.some((s) => s.chapters.some((c) => c.isFreePreview && c.hasVideo));
  const previewHref = featured && hasPreview
    ? `/cursos/${featured.slug}?preview=1`
    : freeCourse
      ? `/cursos/${freeCourse.slug}`
      : "/cursos?price=free";
  const proof = [
    students > 0 ? `${formatNumber(students)} ${students === 1 ? "estudiante aprendiendo" : "estudiantes aprendiendo"}` : null,
    freeCourse ? `empieza gratis con ${freeCourse.title}` : null,
  ].filter(Boolean);

  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pt-16 pb-24 sm:px-10 lg:grid-cols-2 lg:pt-[72px] lg:pb-36">
      <div className="flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#2f3531] bg-term-surface px-3 py-1.5 font-term text-xs text-term-muted">
          <span className="size-[7px] rounded-full bg-term-ok" />
          Cursos en video · acceso de por vida
        </span>
        <h1 className="font-term text-[clamp(2.25rem,4.4vw,3.625rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
          Aprende a programar, una clase corta a la vez.
        </h1>
        <p className="max-w-[540px] text-[19px] text-pretty text-term-muted">
          Cursos organizados por capítulos. Tu progreso se guarda en cada video, preguntas al instructor debajo de cada
          clase y al terminar recibes un certificado verificable.
        </p>
        <div className="flex flex-wrap gap-3 font-term text-[15px]">
          <Link
            href="/cursos"
            className="inline-flex items-center gap-2 rounded-[10px] bg-term-accent px-[22px] py-[15px] font-bold text-term-bg transition-opacity hover:opacity-90"
          >
            explorar cursos <ArrowRight className="size-[18px]" />
          </Link>
          <Link
            href={previewHref}
            className="inline-flex items-center gap-2 rounded-[10px] border border-term-border-strong px-[22px] py-[15px] font-medium transition-colors hover:bg-term-surface"
          >
            <CirclePlay className="size-[18px]" /> ver una clase gratis
          </Link>
        </div>
        {proof.length > 0 && <span className="font-term text-[13px] text-term-muted">{proof.join(" · ")}</span>}
      </div>
      {featured && <ClassroomMockup course={featured} />}
    </section>
  );
}
