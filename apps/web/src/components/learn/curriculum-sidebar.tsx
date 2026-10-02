"use client";

import { CheckCircle2, Circle, Lock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { formatClock, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LearnData } from "./types";

interface CurriculumSidebarProps {
  slug: string;
  data: LearnData;
  currentChapterId: string;
  onNavigate?: () => void;
  className?: string;
}

export function CurriculumSidebar({ slug, data, currentChapterId, onNavigate, className }: CurriculumSidebarProps) {
  const currentSectionId = data.sections.find((s) => s.chapters.some((c) => c.id === currentChapterId))?.id;
  const [open, setOpen] = useState<string[]>(currentSectionId ? [currentSectionId] : []);
  const [prevSectionId, setPrevSectionId] = useState(currentSectionId);

  // Al pasar a una clase de otra sección, esa sección se abre.
  if (currentSectionId !== prevSectionId) {
    setPrevSectionId(currentSectionId);
    if (currentSectionId && !open.includes(currentSectionId)) setOpen([...open, currentSectionId]);
  }

  const numbers = new Map(data.sections.flatMap((s) => s.chapters).map((c, i) => [c.id, i + 1]));

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="space-y-2 border-b p-4">
        <h2 className="font-heading font-semibold">Contenido del curso</h2>
        <Progress value={data.summary.percent} aria-label={`Progreso del curso: ${data.summary.percent} %`} />
        <p className="text-xs text-muted-foreground">
          {data.summary.done} de {data.summary.total} clases completadas · {data.summary.percent} %
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Accordion type="multiple" value={open} onValueChange={setOpen} className="w-full">
          {data.sections.map((section, sectionIndex) => {
            const withVideo = section.chapters.filter((c) => c.hasVideo);
            const done = withVideo.filter((c) => data.progress[c.id]?.completed).length;
            const duration = section.chapters.reduce((sum, c) => sum + (c.hasVideo ? c.durationSec : 0), 0);
            return (
              <AccordionItem key={section.id} value={section.id} className="border-b">
                <AccordionTrigger className="rounded-none px-4 py-3 hover:no-underline">
                  <span className="flex flex-col items-start gap-0.5 text-left">
                    <span className="text-sm font-semibold">
                      Sección {sectionIndex + 1}: {section.title}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {done}/{withVideo.length} · {formatDuration(duration)}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-0 [&_a]:no-underline">
                  <ul>
                    {section.chapters.map((chapter) => {
                      const isCurrent = chapter.id === currentChapterId;
                      const completed = !!data.progress[chapter.id]?.completed;
                      return (
                        <li key={chapter.id}>
                          <Link
                            href={`/aprender/${slug}/${chapter.id}`}
                            onClick={onNavigate}
                            aria-current={isCurrent ? "page" : undefined}
                            className={cn(
                              "flex items-start gap-3 border-l-2 border-transparent px-4 py-2.5 text-sm transition-colors hover:bg-muted/60",
                              isCurrent && "border-primary bg-primary/5 hover:bg-primary/10",
                            )}
                          >
                            <span className="mt-0.5 shrink-0" aria-hidden>
                              {completed ? (
                                <CheckCircle2 className="size-4 text-primary" />
                              ) : (
                                <Circle className="size-4 text-muted-foreground/60" />
                              )}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className={cn("leading-snug", isCurrent && "font-medium text-primary")}>
                                {numbers.get(chapter.id)}. {chapter.title}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                {chapter.hasVideo ? (
                                  <>
                                    <PlayCircle className="size-3" /> {formatClock(chapter.durationSec)}
                                  </>
                                ) : (
                                  <>
                                    <Lock className="size-3" /> Video no disponible
                                  </>
                                )}
                              </span>
                            </span>
                            {completed && <span className="sr-only">Completada</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
