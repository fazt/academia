"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, Lock, SkipForward, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, call } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { LearnHeader } from "./learn-header";
import { LearnEmptyCourse, LearnErrorState, LearnSkeleton } from "./learn-states";
import { LessonPlayer } from "./lesson-player";
import { LessonTabs } from "./lesson-tabs";
import { flattenChapters, learnQueryKey } from "./types";

/** Segundos de cuenta atrás antes de pasar sola a la siguiente clase. */
const AUTO_ADVANCE_SECONDS = 8;

function NextUpBanner({
  title,
  href,
  onCancel,
}: {
  title: string;
  href: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(AUTO_ADVANCE_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.push(href);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, href, router]);

  return (
    <div className="flex flex-col gap-3 border-b bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:px-6" role="status">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Siguiente clase en {secondsLeft} s</p>
        <p className="truncate font-medium">{title}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X /> Cancelar
        </Button>
        <Button size="sm" asChild>
          <Link href={href}>
            <SkipForward /> Ver ahora
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function LearnView({ slug, chapterId }: { slug: string; chapterId: string }) {
  const router = useRouter();
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [endedChapterId, setEndedChapterId] = useState<string | null>(null);

  const { data, error, refetch, isLoading } = useQuery({
    queryKey: learnQueryKey(slug),
    queryFn: () => call(api.me.courses[":slug"].learn.$get({ param: { slug } })),
  });

  const chapters = data ? flattenChapters(data.sections) : [];
  const index = chapters.findIndex((c) => c.id === chapterId);
  const chapter = index >= 0 ? chapters[index] : undefined;
  const prev = index > 0 ? chapters[index - 1] : undefined;
  const next = index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : undefined;
  const fallback = chapters.find((c) => c.hasVideo) ?? chapters[0];

  // Capítulo inexistente (borrado o enlace viejo): se lleva al primero.
  const missingChapter = !!data && !chapter;
  const fallbackId = fallback?.id;
  useEffect(() => {
    if (missingChapter && fallbackId) router.replace(`/aprender/${slug}/${fallbackId}`);
  }, [missingChapter, fallbackId, slug, router]);

  // Título de la pestaña con la clase actual.
  const chapterTitle = chapter?.title;
  const courseTitle = data?.course.title;
  useEffect(() => {
    if (chapterTitle && courseTitle) document.title = `${chapterTitle} · ${courseTitle} · Academia`;
  }, [chapterTitle, courseTitle]);

  if (isLoading) return <LearnSkeleton />;
  if (error) return <LearnErrorState error={error} slug={slug} onRetry={() => void refetch()} />;
  if (!data) return <LearnSkeleton />;
  if (!fallback) return <LearnEmptyCourse slug={slug} />;
  if (!chapter) return <LearnSkeleton />;

  const progress = data.progress[chapter.id];
  const section = data.sections.find((s) => s.id === chapter.sectionId);
  const showNextUp = endedChapterId === chapter.id && !!next;

  return (
    <>
      <LearnHeader data={data} onOpenCurriculum={() => setCurriculumOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">
          <div className="bg-neutral-950">
            <div className="mx-auto max-w-6xl">
              {chapter.hasVideo ? (
                <LessonPlayer
                  key={chapter.id}
                  slug={slug}
                  chapterId={chapter.id}
                  durationSec={chapter.durationSec}
                  initialPositionSec={progress?.positionSec ?? 0}
                  initiallyCompleted={!!progress?.completed}
                  onEnded={() => setEndedChapterId(chapter.id)}
                />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center text-neutral-100">
                  <div className="grid size-12 place-items-center rounded-full bg-white/10">
                    <Lock className="size-5" />
                  </div>
                  <p className="max-w-sm text-sm font-medium">El video de esta clase todavía no está disponible.</p>
                </div>
              )}
            </div>
          </div>

          {showNextUp && next && (
            <NextUpBanner
              key={next.id}
              title={next.title}
              href={`/aprender/${slug}/${next.id}`}
              onCancel={() => setEndedChapterId(null)}
            />
          )}

          <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                {section && (
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{section.title}</p>
                )}
                <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                  {index + 1}. {chapter.title}
                </h1>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  {chapter.hasVideo && <span>{formatDuration(chapter.durationSec)}</span>}
                  {progress?.completed && (
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      <CheckCircle2 className="size-4" /> Completada
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {prev ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/aprender/${slug}/${prev.id}`}>
                      <ChevronLeft /> Anterior
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeft /> Anterior
                  </Button>
                )}
                {next ? (
                  <Button size="sm" asChild>
                    <Link href={`/aprender/${slug}/${next.id}`}>
                      Siguiente <ChevronRight />
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Siguiente <ChevronRight />
                  </Button>
                )}
              </div>
            </div>

            <LessonTabs chapter={chapter} instructor={data.instructor} />
          </div>
        </main>

        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-[22rem] shrink-0 border-l bg-card lg:flex xl:w-96">
          <CurriculumSidebar slug={slug} data={data} currentChapterId={chapter.id} className="w-full" />
        </aside>
      </div>

      <Sheet open={curriculumOpen} onOpenChange={setCurriculumOpen}>
        <SheetContent side="right" className="w-[90vw] gap-0 p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Contenido del curso</SheetTitle>
            <SheetDescription>Secciones y clases de {data.course.title}</SheetDescription>
          </SheetHeader>
          <CurriculumSidebar
            slug={slug}
            data={data}
            currentChapterId={chapter.id}
            onNavigate={() => setCurriculumOpen(false)}
            className="h-full pt-10"
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
