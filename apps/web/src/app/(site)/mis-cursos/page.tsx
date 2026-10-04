"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { CourseGrid } from "@/components/course/course-card";
import { Container, PageHeader } from "@/components/layout/page-header";
import type { MyCourse } from "@/components/learn/types";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tarjeta con la forma de las de la portada; toda la tarjeta lleva a la última clase vista. */
function MyCourseCard({ course }: { course: MyCourse }) {
  const continueHref = course.lastChapterId
    ? `/aprender/${course.slug}/${course.lastChapterId}`
    : `/aprender/${course.slug}`;
  const started = course.progress.done > 0 || !!course.lastChapterId;
  const finished = course.progress.total > 0 && course.progress.done >= course.progress.total;

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-[14px] border bg-term-surface transition-colors hover:bg-term-raised has-[h3_a:focus-visible]:ring-2 has-[h3_a:focus-visible]:ring-term-accent",
        finished ? "border-term-ok/50" : "border-term-border hover:border-term-border-strong",
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
        <h3 className="text-[21px] leading-snug font-semibold">
          {/* El enlace del título se extiende a toda la tarjeta. */}
          <Link href={continueHref} className="outline-none after:absolute after:inset-0">
            {course.title}
          </Link>
        </h3>
        <span className="font-term text-[13px] text-term-muted">
          {course.instructor.name} · inscrito el {formatDate(course.enrolledAt)}
        </span>
        <div className="mt-auto flex flex-col gap-2 pt-3">
          <div className="flex items-baseline justify-between font-term text-[13px] text-term-muted">
            <span>
              {course.progress.done}/{course.progress.total} clases
            </span>
            <span className={cn("font-bold", finished ? "text-term-ok" : "text-term-text")}>
              {course.progress.percent} %
            </span>
          </div>
          <Progress
            value={course.progress.percent}
            aria-label={`Progreso: ${course.progress.percent} %`}
            className={cn("bg-term-border", finished && "*:data-[slot=progress-indicator]:bg-term-ok")}
          />
        </div>
        <div className="flex items-baseline justify-between gap-3 pt-1 font-term text-[13px]">
          <span aria-hidden className="text-term-accent group-hover:underline">
            {finished ? "repasar →" : started ? "continuar →" : "empezar →"}
          </span>
          {course.certificateCode && (
            <Link
              href={`/certificados/${course.certificateCode}`}
              className="relative z-10 text-term-ok underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none"
            >
              certificado ✓
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function CoursesSkeleton() {
  return (
    <CourseGrid>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[14px] border border-term-border bg-term-surface p-6">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="mt-6 h-1 w-full" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </CourseGrid>
  );
}

function CourseSection({ title, courses }: { title: string; courses: MyCourse[] }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3 border-b border-term-border pb-3">
        <h2 className="font-term text-lg font-extrabold">{title}</h2>
        <span className="font-term text-[13px] text-term-muted">
          {courses.length} {courses.length === 1 ? "curso" : "cursos"}
        </span>
      </div>
      <CourseGrid>
        {courses.map((course) => (
          <MyCourseCard key={course.id} course={course} />
        ))}
      </CourseGrid>
    </section>
  );
}

export default function MyCoursesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-courses"],
    queryFn: () => call(api.me.courses.$get()),
  });

  const items = data?.items ?? [];
  const inProgress = items.filter((c) => c.progress.total === 0 || c.progress.done < c.progress.total);
  const completed = items.filter((c) => c.progress.total > 0 && c.progress.done >= c.progress.total);

  return (
    <Container className="flex flex-col gap-10 py-12">
      <PageHeader
        command="ls mis-cursos/"
        title="Mis cursos"
        description="Retoma tus clases donde las dejaste."
        actions={
          <Button variant="outline" asChild>
            <Link href="/cursos">explorar más cursos</Link>
          </Button>
        }
      />

      {isLoading ? (
        <CoursesSkeleton />
      ) : error ? (
        <Empty className="rounded-[14px] border border-term-border">
          <EmptyHeader>
            <EmptyTitle>No se pudieron cargar tus cursos</EmptyTitle>
            <EmptyDescription>{errorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : items.length === 0 ? (
        <Empty className="rounded-[14px] border border-dashed border-term-border-strong p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes cursos</EmptyTitle>
            <EmptyDescription>Explora el catálogo y empieza a aprender hoy mismo.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/cursos">ver cursos →</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-12">
          {inProgress.length > 0 && <CourseSection title="En curso" courses={inProgress} />}
          {completed.length > 0 && <CourseSection title="Completados" courses={completed} />}
        </div>
      )}
    </Container>
  );
}
