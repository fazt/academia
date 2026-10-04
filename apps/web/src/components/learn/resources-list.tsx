"use client";

import { Download, File, FileArchive, FileCode, FileImage, FileText, FolderOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TermPanel } from "@/components/layout/term";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { api, call, errorMessage } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { LearnResource } from "./types";

function iconFor(mimeType: string, name: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (/zip|rar|7z|tar|gzip/.test(mimeType) || /\.(zip|rar|7z|tar|gz)$/i.test(name)) return FileArchive;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return FileText;
  if (/json|javascript|typescript|xml|x-python|x-sh/.test(mimeType)) return FileCode;
  return File;
}

export function ResourcesList({ chapterId, resources }: { chapterId: string; resources: LearnResource[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (resources.length === 0) {
    return (
      <Empty className="rounded-[14px] border border-dashed border-term-border-strong py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle>Esta clase no tiene recursos</EmptyTitle>
          <EmptyDescription>Cuando el instructor añada archivos de apoyo, aparecerán aquí.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const download = async (resource: LearnResource) => {
    setDownloading(resource.id);
    try {
      const { url } = await call(
        api.chapters[":id"].resources[":resourceId"].download.$get({
          param: { id: chapterId, resourceId: resource.id },
        }),
      );
      // La URL firmada responde con Content-Disposition: attachment, así que descarga sin salir de la página.
      const link = document.createElement("a");
      link.href = url;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDownloading(null);
    }
  };

  // Lista de archivos, como un `ls -lh` de la carpeta de la clase.
  return (
    <TermPanel
      title="recursos/"
      aside={
        <span className="shrink-0">
          {resources.length} {resources.length === 1 ? "archivo" : "archivos"}
        </span>
      }
    >
      <ul>
        {resources.map((resource) => {
          const Icon = iconFor(resource.mimeType, resource.name);
          return (
            <li
              key={resource.id}
              className="flex items-center gap-3 border-b border-term-border px-4 py-3 transition-colors last:border-b-0 hover:bg-term-raised"
            >
              <Icon className="size-4 shrink-0 text-term-muted" aria-hidden />
              <p className="min-w-0 flex-1 truncate font-term text-sm">{resource.name}</p>
              <span className="shrink-0 font-term text-xs text-term-muted tabular-nums">
                {formatBytes(resource.sizeBytes)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={downloading === resource.id}
                onClick={() => download(resource)}
                aria-label={`Descargar ${resource.name}`}
              >
                {downloading === resource.id ? <Spinner /> : <Download />}
                <span className="hidden sm:inline">descargar</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </TermPanel>
  );
}
