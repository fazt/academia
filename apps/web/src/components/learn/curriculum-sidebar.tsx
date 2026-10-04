"use client";

import { Check, Lock } from "lucide-react";
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
      <div className="flex flex-col gap-3 border-b border-term-border px-[18px] py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Contenido del curso</h2>
          <span className="font-term text-xs text-term-muted">
            {data.summary.done}/{data.summary.total} · {data.summary.percent} %
          </span>
        </div>
        <Progress
          value={data.summary.percent}
          aria-label={`Progreso del curso: ${data.summary.percent} %`}
          className="bg-term-border"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Accordion type="multiple" value={open} onValueChange={setOpen} className="w-full">
          {data.sections.map((section, sectionIndex) => {
            const withVideo = section.chapters.filter((c) => c.hasVideo);
            const done = withVideo.filter((c) => data.progress[c.id]?.completed).length;
            const duration = section.chapters.reduce((sum, c) => sum + (c.hasVideo ? c.durationSec : 0), 0);
            return (
              <AccordionItem key={section.id} value={section.id} className="border-b border-term-border">
                <AccordionTrigger className="rounded-none px-[18px] py-3.5 hover:bg-term-raised hover:no-underline focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:ring-inset">
                  <span className="flex flex-col items-start gap-1 text-left">
                    <span className="font-term text-xs font-normal text-term-muted">
                      sección {sectionIndex + 1} · {done}/{withVideo.length} · {formatDuration(duration)}
                    </span>
                    <span className="text-sm font-semibold">{section.title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-2 [&_a]:no-underline">
                  <ul className="flex flex-col gap-0.5">
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
                              "flex items-start gap-3 rounded-[10px] px-2.5 py-2.5 text-sm transition-colors hover:bg-term-raised focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none",
                              isCurrent &&
                                "bg-[color-mix(in_oklch,var(--term-accent)_12%,var(--term-surface))] font-semibold hover:bg-[color-mix(in_oklch,var(--term-accent)_16%,var(--term-surface))]",
                            )}
                          >
                            <span className="mt-px shrink-0" aria-hidden>
                              {completed ? (
                                <span className="grid size-5 place-items-center rounded-full bg-term-ok text-term-bg">
                                  <Check className="size-3" strokeWidth={3} />
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    "block size-5 rounded-full border-2",
                                    isCurrent ? "border-term-accent" : "border-term-border-strong",
                                  )}
                                />
                              )}
                            </span>
                            <span className={cn("min-w-0 flex-1 leading-snug", isCurrent && "text-term-accent")}>
                              {numbers.get(chapter.id)}. {chapter.title}
                            </span>
                            <span className="mt-0.5 shrink-0 font-term text-xs font-normal text-term-muted">
                              {chapter.hasVideo ? (
                                formatClock(chapter.durationSec)
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Lock className="size-3" aria-hidden /> sin video
                                </span>
                              )}
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
