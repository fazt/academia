"use client";

import { Download, File, FileArchive, FileCode, FileImage, FileText, FolderOpen } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
      <Empty className="border border-dashed py-10">
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

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {resources.map((resource) => {
        const Icon = iconFor(resource.mimeType, resource.name);
        return (
          <li key={resource.id} className="flex items-center gap-3 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{resource.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(resource.sizeBytes)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={downloading === resource.id}
              onClick={() => download(resource)}
              aria-label={`Descargar ${resource.name}`}
            >
              {downloading === resource.id ? <Spinner /> : <Download />}
              <span className="hidden sm:inline">Descargar</span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
