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
          <DialogDescription>Vista previa del curso</DialogDescription>
          <DialogTitle className="font-heading text-lg">{courseTitle}</DialogTitle>
        </DialogHeader>
        {active && open && <StreamPlayer key={active.id} chapterId={active.id} autoplay />}
        {chapters.length > 1 && (
          <div className="max-h-56 overflow-y-auto p-3">
            <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase">Clases de vista previa gratuitas</p>
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => onActiveChange(chapter.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted",
                  chapter.id === active?.id && "bg-primary/10 font-medium text-primary",
                )}
              >
                <PlayCircle className="size-4 shrink-0" />
                <span className="flex-1">{chapter.title}</span>
                <span className="text-xs text-muted-foreground">{formatClock(chapter.durationSec)}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
