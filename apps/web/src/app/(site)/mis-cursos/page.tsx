"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, PlayCircle } from "lucide-react";
import Link from "next/link";
import { CourseCover } from "@/components/course/course-cover";
import { Container, PageHeader } from "@/components/layout/page-header";
import type { MyCourse } from "@/components/learn/types";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

function MyCourseCard({ course }: { course: MyCourse }) {
  const continueHref = course.lastChapterId
    ? `/aprender/${course.slug}/${course.lastChapterId}`
    : `/aprender/${course.slug}`;
  const started = course.progress.done > 0 || !!course.lastChapterId;
  const finished = course.progress.total > 0 && course.progress.done >= course.progress.total;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5">
      <Link href={continueHref} className="relative block overflow-hidden" tabIndex={-1} aria-hidden>
        <CourseCover
          title={course.title}
          src={course.coverImageUrl}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          <PlayCircle className="size-12 text-white drop-shadow" />
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h2 className="line-clamp-2 font-heading leading-snug font-semibold">
            <Link href={continueHref} className="hover:text-primary">
              {course.title}
            </Link>
          </h2>
          <p className="text-xs text-muted-foreground">{course.instructor.name}</p>
        </div>
        <div className="mt-auto space-y-1.5">
          <Progress value={course.progress.percent} aria-label={`Progreso: ${course.progress.percent} %`} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {course.progress.done} de {course.progress.total} clases
            </span>
            <span className="font-medium text-foreground">{course.progress.percent} %</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={continueHref}>
              <PlayCircle />
              {finished ? "Repasar" : started ? "Continuar" : "Empezar"}
            </Link>
          </Button>
          {course.certificateCode && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/certificados/${course.certificateCode}`}>
                <Award /> Certificado
              </Link>
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Inscrito el {formatDate(course.enrolledAt)}</p>
      </div>
    </article>
  );
}

function CoursesSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-7 w-full" />
          </div>
        </div>
      ))}
    </div>
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
    <Container className="space-y-8 py-10">
      <PageHeader
        title="Mis cursos"
        description="Retoma tus clases donde las dejaste."
        actions={
          <Button variant="outline" asChild>
            <Link href="/cursos">Explorar más cursos</Link>
          </Button>
        }
      />

      {isLoading ? (
        <CoursesSkeleton />
      ) : error ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No se pudieron cargar tus cursos</EmptyTitle>
            <EmptyDescription>{errorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : items.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes cursos</EmptyTitle>
            <EmptyDescription>Explora el catálogo y empieza a aprender hoy mismo.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/cursos">Ver cursos</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-10">
          {inProgress.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-semibold">En curso</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inProgress.map((course) => (
                  <MyCourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-lg font-semibold">Completados</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {completed.map((course) => (
                  <MyCourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
