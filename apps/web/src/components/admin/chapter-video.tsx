"use client";

import { AlertTriangle, Play, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { VideoStatusBadge } from "@/components/admin/badges";
import { ConfirmAction } from "@/components/admin/confirm-button";
import type { AdminChapter } from "@/components/admin/types";
import { useVideoUploads } from "@/components/admin/video-uploads";
import { StreamPlayer } from "@/components/video/stream-player";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, call, errorMessage } from "@/lib/api";
import { formatClock } from "@/lib/format";

/** Estado del video de un capítulo y acciones: subir, reemplazar, previsualizar, quitar. */
export function ChapterVideo({
  courseId,
  chapter,
  streamConfigured,
}: {
  courseId: string;
  chapter: AdminChapter;
  streamConfigured: boolean;
}) {
  const queryClient = useQueryClient();
  const { uploads, start, cancel, dismiss, sync } = useVideoUploads();
  const upload = uploads[chapter.id];
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const removeVideo = async () => {
    try {
      await call(api.admin.chapters[":id"].video.$delete({ param: { id: chapter.id } }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] });
      toast.success("Video eliminado");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="video/*"
      className="sr-only"
      tabIndex={-1}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void start(chapter.id, file);
      }}
    />
  );

  // Subida en curso (o fallida) en esta sesión.
  if (upload) {
    if (upload.phase === "error") {
      return (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {fileInput}
          <span className="inline-flex items-center gap-1 text-destructive">
            <AlertTriangle className="size-3.5" /> {upload.error ?? "La subida falló"}
          </span>
          <Button size="xs" variant="outline" onClick={pickFile}>
            <RefreshCw /> Reintentar
          </Button>
          <Button size="xs" variant="ghost" onClick={() => dismiss(chapter.id)}>
            Cerrar
          </Button>
        </div>
      );
    }
    return (
      <div className="flex w-full max-w-xs items-center gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{upload.phase === "preparing" ? "Preparando…" : upload.filename}</span>
            <span className="tabular-nums">{upload.progress} %</span>
          </div>
          <Progress value={upload.progress} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-xs" variant="ghost" onClick={() => void cancel(chapter.id)} aria-label="Cancelar subida">
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cancelar subida</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {fileInput}
      <VideoStatusBadge status={chapter.videoStatus} />
      {chapter.videoStatus === "ready" && (
        <span className="text-xs text-muted-foreground tabular-nums">{formatClock(chapter.durationSec)}</span>
      )}
      {chapter.videoStatus === "processing" && <Spinner className="size-3.5 text-muted-foreground" />}

      {chapter.videoStatus === "ready" && (
        <Button size="xs" variant="ghost" onClick={() => setPreviewOpen(true)}>
          <Play /> Ver
        </Button>
      )}

      {chapter.videoStatus === "uploading" && (
        <Button
          size="xs"
          variant="ghost"
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            const status = await sync(chapter.id, false);
            setChecking(false);
            if (status === "uploading") toast.message("La subida quedó incompleta. Vuelve a subir el archivo.");
          }}
        >
          {checking ? <Spinner /> : <RefreshCw />} Comprobar
        </Button>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={streamConfigured ? -1 : 0}>
            <Button size="xs" variant="outline" disabled={!streamConfigured} onClick={pickFile}>
              <Upload /> {chapter.videoStatus === "none" ? "Subir video" : "Reemplazar"}
            </Button>
          </span>
        </TooltipTrigger>
        {!streamConfigured && <TooltipContent>Configura Cloudflare Stream para subir videos</TooltipContent>}
      </Tooltip>

      {chapter.videoStatus !== "none" && (
        <ConfirmAction
          destructive
          title="¿Quitar el video?"
          description="Se borrará el video de Cloudflare Stream. El capítulo quedará sin video."
          confirmLabel="Quitar video"
          onConfirm={removeVideo}
          trigger={
            <Button size="icon-xs" variant="ghost" aria-label="Quitar video">
              <Trash2 />
            </Button>
          }
        />
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="gap-3 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{chapter.title}</DialogTitle>
            <DialogDescription>Vista previa del capítulo</DialogDescription>
          </DialogHeader>
          {previewOpen && <StreamPlayer chapterId={chapter.id} className="rounded-lg" autoplay />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
