"use client";

import { FileText, Paperclip, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/admin/confirm-button";
import type { AdminChapter } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, call, errorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { uploadToSpaces } from "@/lib/upload";

const MAX_BYTES = 200 * 1024 * 1024;

/** Archivos descargables del capítulo (se guardan en un prefijo privado de Spaces). */
export function ChapterResources({ courseId, chapter }: { courseId: string; chapter: AdminChapter }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] });

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("El archivo supera los 200 MB");
      return;
    }
    setProgress(0);
    try {
      const contentType = file.type || "application/octet-stream";
      const presign = await call(
        api.admin.uploads.presign.$post({
          json: { kind: "resource", filename: file.name, contentType, sizeBytes: file.size },
        }),
      );
      await uploadToSpaces(presign, file, setProgress);
      await call(
        api.admin.chapters[":id"].resources.$post({
          param: { id: chapter.id },
          json: { name: file.name, fileKey: presign.key, sizeBytes: file.size, mimeType: contentType },
        }),
      );
      await refresh();
      toast.success("Recurso añadido");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProgress(null);
    }
  };

  const remove = async (resourceId: string) => {
    try {
      await call(api.admin.resources[":id"].$delete({ param: { id: resourceId } }));
      await refresh();
      toast.success("Recurso eliminado");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  return (
    <div className="space-y-2">
      {chapter.resources.length > 0 && (
        <ul className="divide-y divide-term-border rounded-[10px] border border-term-border bg-term-bg">
          {chapter.resources.map((resource) => (
            <li key={resource.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-term text-[13px]">{resource.name}</span>
              <span className="shrink-0 font-term text-xs text-term-muted tabular-nums">{formatBytes(resource.sizeBytes)}</span>
              <ConfirmAction
                destructive
                title="¿Borrar este recurso?"
                description={`Los alumnos dejarán de poder descargar «${resource.name}».`}
                confirmLabel="borrar"
                onConfirm={() => remove(resource.id)}
                trigger={
                  <Button size="icon-xs" variant="ghost" aria-label={`Borrar ${resource.name}`}>
                    <Trash2 />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {progress !== null ? (
        <div className="flex max-w-xs items-center gap-2 font-term text-xs text-term-muted">
          <Progress value={progress} className="flex-1" />
          <span className="tabular-nums">{progress} %</span>
        </div>
      ) : (
        <Button size="xs" variant="outline" onClick={() => inputRef.current?.click()}>
          <Paperclip /> añadir recurso
        </Button>
      )}
    </div>
  );
}
