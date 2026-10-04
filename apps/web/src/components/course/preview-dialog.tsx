"use client";

import { PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StreamPlayer } from "@/components/video/stream-player";
import { formatClock } from "@/lib/format";
import type { CurriculumChapter } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PreviewDialog({
  courseTitle,
  chapters,
  activeId,
  onActiveChange,
  open,
  onOpenChange,
}: {
  courseTitle: string;
  chapters: CurriculumChapter[];
  activeId: string | null;
  onActiveChange: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const active = chapters.find((c) => c.id === activeId) ?? chapters[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="p-5 pb-3">
          <DialogDescription className="font-term text-[13px]">
            <span className="text-term-accent">$</span> play vista-previa
          </DialogDescription>
          <DialogTitle className="text-lg font-extrabold tracking-[-0.01em]">{courseTitle}</DialogTitle>
        </DialogHeader>
        {/* La pantalla del reproductor es oscura en los dos temas. */}
        <div className="dark bg-term-screen">
          {active && open && <StreamPlayer key={active.id} chapterId={active.id} autoplay />}
        </div>
        {chapters.length > 1 && (
          <div className="max-h-56 overflow-y-auto border-t border-term-border p-3">
            <p className="px-2 pb-2 font-term text-xs text-term-muted">clases de vista previa gratuitas</p>
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => onActiveChange(chapter.id)}
                aria-current={chapter.id === active?.id ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-sm transition-colors hover:bg-term-raised focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none",
                  chapter.id === active?.id &&
                    "bg-[color-mix(in_oklch,var(--term-accent)_12%,var(--term-surface))] font-semibold text-term-accent hover:bg-[color-mix(in_oklch,var(--term-accent)_12%,var(--term-surface))]",
                )}
              >
                <PlayCircle className="size-4 shrink-0" />
                <span className="flex-1">{chapter.title}</span>
                <span className="font-term text-xs font-normal text-term-muted">{formatClock(chapter.durationSec)}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
