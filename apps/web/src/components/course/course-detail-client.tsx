"use client";

import { Lock, PlayCircle } from "lucide-react";
import { useState } from "react";
import { PreviewDialog } from "@/components/course/preview-dialog";
import { PurchaseCard } from "@/components/course/purchase-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatClock, formatDuration } from "@/lib/format";
import type { CourseDetail } from "@/lib/types";

/**
 * Partes interactivas del detalle de curso: la tarjeta de compra y el temario
 * comparten el diálogo de vista previa.
 */
export function useCoursePreview(course: CourseDetail, autoOpen = false) {
  const previews = course.sections.flatMap((s) => s.chapters).filter((c) => c.isFreePreview && c.hasVideo);
  // ?preview=1 (enlace "ver una clase gratis" de la portada) abre la vista previa al llegar.
  const [open, setOpen] = useState(autoOpen && previews.length > 0);
  const [activeId, setActiveId] = useState<string | null>(autoOpen ? (previews[0]?.id ?? null) : null);
  return {
    previews,
    open: (chapterId?: string) => {
      setActiveId(chapterId ?? previews[0]?.id ?? null);
      setOpen(true);
    },
    dialog: (
      <PreviewDialog
        courseTitle={course.title}
        chapters={previews}
        activeId={activeId}
        onActiveChange={setActiveId}
        open={open}
        onOpenChange={setOpen}
      />
    ),
  };
}

export function CourseDetailClient({
  course,
  intro,
  autoPreview = false,
  children,
}: {
  course: CourseDetail;
  /** Abre la vista previa al cargar (llega desde la portada con ?preview=1). */
  autoPreview?: boolean;
  /** Contenido estático (del servidor) antes del temario */
  intro?: React.ReactNode;
  /** Contenido estático (del servidor) después del temario */
  children: React.ReactNode;
}) {
  const preview = useCoursePreview(course, autoPreview);
  const totalChapters = course.sections.reduce((sum, s) => sum + s.chapters.length, 0);

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="order-2 min-w-0 space-y-12 lg:order-1">
          {intro}

          <section>
            <h2 className="mb-1 font-heading text-2xl font-bold">Contenido del curso</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {course.sections.length} secciones · {totalChapters} clases · {formatDuration(course.durationSec)} en total
            </p>
            <Accordion type="multiple" defaultValue={course.sections.slice(0, 1).map((s) => s.id)} className="rounded-xl border">
              {course.sections.map((section) => {
                const sectionDuration = section.chapters.reduce((sum, c) => sum + c.durationSec, 0);
                return (
                  <AccordionItem key={section.id} value={section.id} className="px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="flex flex-1 flex-wrap items-baseline justify-between gap-2 pr-3">
                        <span className="font-semibold">{section.title}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {section.chapters.length} clases · {formatDuration(sectionDuration)}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1">
                        {section.chapters.map((chapter) => {
                          const canPreview = chapter.isFreePreview && chapter.hasVideo;
                          return (
                            <li key={chapter.id} className="flex items-center gap-3 rounded-md py-1.5 text-sm">
                              {canPreview ? (
                                <PlayCircle className="size-4 shrink-0 text-primary" />
                              ) : (
                                <Lock className="size-4 shrink-0 text-muted-foreground" />
                              )}
                              {canPreview ? (
                                <button
                                  type="button"
                                  className="flex-1 text-left text-primary underline-offset-4 hover:underline"
                                  onClick={() => preview.open(chapter.id)}
                                >
                                  {chapter.title}
                                </button>
                              ) : (
                                <span className="flex-1">{chapter.title}</span>
                              )}
                              {canPreview && (
                                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => preview.open(chapter.id)}>
                                  Vista previa
                                </Button>
                              )}
                              <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                                {chapter.durationSec > 0 ? formatClock(chapter.durationSec) : "—"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>

          {children}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-24 lg:-mt-64">
            <PurchaseCard
              course={course}
              resourcesCount={course.resourcesCount}
              hasPreview={preview.previews.length > 0}
              onPreview={() => preview.open()}
            />
          </div>
        </aside>
      </div>
      {preview.dialog}
    </>
  );
}
