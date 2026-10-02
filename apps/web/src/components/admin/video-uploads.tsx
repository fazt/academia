"use client";

import type { VideoStatus } from "@academia/shared";
import { useQueryClient } from "@tanstack/react-query";
import type { Upload } from "tus-js-client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, call, errorMessage } from "@/lib/api";

/** 50 MiB: múltiplo de 256 KiB dentro del rango que admite Cloudflare Stream (5–200 MiB). */
const CHUNK_SIZE = 50 * 1024 * 1024;
const POLL_MS = 5000;

export interface UploadState {
  phase: "preparing" | "uploading" | "finishing" | "error";
  progress: number;
  filename: string;
  error?: string;
}

interface VideoUploadsValue {
  uploads: Record<string, UploadState>;
  start: (chapterId: string, file: File) => Promise<void>;
  cancel: (chapterId: string) => Promise<void>;
  dismiss: (chapterId: string) => void;
  sync: (chapterId: string, silent?: boolean) => Promise<VideoStatus | null>;
}

const VideoUploadsContext = createContext<VideoUploadsValue | null>(null);

/**
 * Estado de las subidas de video del curso. Vive por encima de las filas de
 * capítulo para que una subida siga visible aunque el capítulo se mueva de
 * sección (la fila se vuelve a montar) y para sondear el procesado de Stream.
 */
export function VideoUploadsProvider({
  courseId,
  chapters,
  children,
}: {
  courseId: string;
  chapters: { id: string; videoStatus: VideoStatus }[];
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const instances = useRef(new Map<string, Upload>());
  // Capítulos recién subidos: se sondean aunque la base aún diga "uploading".
  const [awaitingSync, setAwaitingSync] = useState<Set<string>>(new Set());
  // `sync` lee el estado actual desde una ref para no cambiar de identidad en cada render
  // (si no, el intervalo de sondeo se reiniciaría con cada actualización de progreso).
  const chaptersRef = useRef(chapters);
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["admin", "course", courseId] }),
    [queryClient, courseId],
  );

  const patch = useCallback((chapterId: string, value: Partial<UploadState> | null) => {
    setUploads((current) => {
      const next = { ...current };
      if (value === null) delete next[chapterId];
      else next[chapterId] = { ...(current[chapterId] ?? { phase: "preparing", progress: 0, filename: "" }), ...value };
      return next;
    });
  }, []);

  const sync = useCallback(
    async (chapterId: string, silent = true) => {
      try {
        const result = await call(api.admin.chapters[":id"]["video-sync"].$post({ param: { id: chapterId } }));
        const current = chaptersRef.current.find((c) => c.id === chapterId)?.videoStatus;
        if (result.videoStatus !== current) await refresh();
        if (result.videoStatus === "ready" || result.videoStatus === "error") {
          setAwaitingSync((set) => {
            const next = new Set(set);
            next.delete(chapterId);
            return next;
          });
          if (result.videoStatus === "error") {
            toast.error("Stream no pudo procesar el video", { description: result.errorReason ?? undefined });
          } else if (!silent || current !== "ready") {
            toast.success("Video listo para reproducir");
          }
        }
        return result.videoStatus;
      } catch (error) {
        if (!silent) toast.error(errorMessage(error));
        return null;
      }
    },
    [refresh],
  );

  const start = useCallback(
    async (chapterId: string, file: File) => {
      if (!file.type.startsWith("video/")) {
        toast.error("Elige un archivo de video");
        return;
      }
      if (instances.current.has(chapterId)) return;
      patch(chapterId, { phase: "preparing", progress: 0, filename: file.name, error: undefined });
      try {
        const { uploadUrl } = await call(
          api.admin.chapters[":id"]["video-upload"].$post({
            param: { id: chapterId },
            json: { sizeBytes: file.size, filename: file.name },
          }),
        );
        await refresh();
        const { Upload: TusUpload } = await import("tus-js-client");
        const upload = new TusUpload(file, {
          uploadUrl,
          chunkSize: CHUNK_SIZE,
          retryDelays: [0, 3000, 5000, 10000],
          storeFingerprintForResuming: false,
          removeFingerprintOnSuccess: true,
          metadata: { filename: file.name, filetype: file.type },
          onProgress: (sent, total) => {
            patch(chapterId, { phase: "uploading", progress: total ? Math.round((sent / total) * 100) : 0 });
          },
          onSuccess: () => {
            instances.current.delete(chapterId);
            patch(chapterId, null);
            setAwaitingSync((set) => new Set(set).add(chapterId));
            toast.success("Video subido. Stream lo está procesando…");
            void sync(chapterId);
          },
          onError: (error) => {
            instances.current.delete(chapterId);
            patch(chapterId, { phase: "error", error: error.message || "La subida falló" });
          },
        });
        instances.current.set(chapterId, upload);
        patch(chapterId, { phase: "uploading" });
        upload.start();
      } catch (error) {
        patch(chapterId, { phase: "error", error: errorMessage(error) });
      }
    },
    [patch, refresh, sync],
  );

  const cancel = useCallback(
    async (chapterId: string) => {
      const upload = instances.current.get(chapterId);
      instances.current.delete(chapterId);
      patch(chapterId, null);
      if (upload) await upload.abort().catch(() => undefined);
      try {
        // Quita el video a medio subir para que el capítulo vuelva a "Sin video".
        await call(api.admin.chapters[":id"].video.$delete({ param: { id: chapterId } }));
        await refresh();
        toast.message("Subida cancelada");
      } catch (error) {
        toast.error(errorMessage(error));
      }
    },
    [patch, refresh],
  );

  const dismiss = useCallback((chapterId: string) => patch(chapterId, null), [patch]);

  // Sondea los capítulos en procesamiento (y los recién subidos) cada 5 s.
  const toPoll = useMemo(
    () =>
      chapters
        .filter((c) => c.videoStatus === "processing" || (awaitingSync.has(c.id) && c.videoStatus !== "ready"))
        .map((c) => c.id),
    [chapters, awaitingSync],
  );
  const pollKey = toPoll.join(",");

  useEffect(() => {
    if (!pollKey) return;
    const ids = pollKey.split(",");
    const timer = setInterval(() => {
      for (const id of ids) void sync(id);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [pollKey, sync]);

  // Avisa antes de cerrar la pestaña con subidas en curso.
  const uploading = Object.values(uploads).some((u) => u.phase === "uploading" || u.phase === "preparing");
  useEffect(() => {
    if (!uploading) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploading]);

  // Al desmontar el editor se cancelan las subidas en curso.
  useEffect(() => {
    const current = instances.current;
    return () => {
      for (const upload of current.values()) void upload.abort().catch(() => undefined);
      current.clear();
    };
  }, []);

  const value = useMemo(() => ({ uploads, start, cancel, dismiss, sync }), [uploads, start, cancel, dismiss, sync]);
  return <VideoUploadsContext.Provider value={value}>{children}</VideoUploadsContext.Provider>;
}

export function useVideoUploads() {
  const ctx = useContext(VideoUploadsContext);
  if (!ctx) throw new Error("useVideoUploads debe usarse dentro de VideoUploadsProvider");
  return ctx;
}
