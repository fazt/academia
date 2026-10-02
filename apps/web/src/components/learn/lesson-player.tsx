"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StreamPlayer } from "@/components/video/stream-player";
import { api, call } from "@/lib/api";
import { type LearnData, learnQueryKey } from "./types";

/** Intervalo mínimo entre guardados de progreso durante la reproducción. */
const SAVE_INTERVAL_MS = 10_000;

function recalcSummary(data: LearnData, progress: LearnData["progress"]): LearnData["summary"] {
  const withVideo = data.sections.flatMap((s) => s.chapters).filter((c) => c.hasVideo);
  const done = withVideo.filter((c) => progress[c.id]?.completed).length;
  const total = withVideo.length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

interface LessonPlayerProps {
  slug: string;
  chapterId: string;
  durationSec: number;
  initialPositionSec: number;
  initiallyCompleted: boolean;
  onEnded?: () => void;
}

/**
 * Reproductor de la clase con guardado de progreso: cada ~10 s mientras se ve,
 * al pausar, al terminar y al salir de la clase. El servidor decide cuándo la
 * clase cuenta como completada.
 */
export function LessonPlayer({
  slug,
  chapterId,
  durationSec,
  initialPositionSec,
  initiallyCompleted,
  onEnded,
}: LessonPlayerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Se calcula una sola vez: si cambiara, el reproductor recargaría el iframe.
  const [startTime] = useState(() => {
    const nearEnd = durationSec > 0 && initialPositionSec >= durationSec * 0.95;
    return initiallyCompleted || nearEnd ? 0 : initialPositionSec;
  });

  const lastSentAt = useRef(0);
  const lastSentPosition = useRef(Math.round(initialPositionSec));
  const latestPosition = useRef(initialPositionSec);

  const save = useCallback(
    async (positionSec: number, ended = false) => {
      const rounded = Math.round(positionSec);
      if (!ended && rounded === lastSentPosition.current) return;
      lastSentAt.current = Date.now();
      lastSentPosition.current = rounded;
      try {
        const result = await call(
          api.chapters[":id"].progress.$put({ param: { id: chapterId }, json: { positionSec: rounded, ended } }),
        );
        queryClient.setQueryData<LearnData>(learnQueryKey(slug), (old) => {
          if (!old) return old;
          const progress = {
            ...old.progress,
            [chapterId]: { positionSec: result.positionSec, completed: result.completed },
          };
          return { ...old, progress, summary: recalcSummary(old, progress), lastChapterId: chapterId };
        });
        if (result.justCompleted) {
          toast.success("Clase completada", { description: "Tu progreso se ha guardado." });
          void queryClient.invalidateQueries({ queryKey: ["my-courses"] });
        }
        if (result.certificateCode) {
          const code = result.certificateCode;
          toast.success("¡Enhorabuena, completaste el curso!", {
            description: "Tu certificado ya está disponible.",
            duration: 15_000,
            action: { label: "Ver certificado", onClick: () => router.push(`/certificados/${code}`) },
          });
          void queryClient.invalidateQueries({ queryKey: learnQueryKey(slug) });
          void queryClient.invalidateQueries({ queryKey: ["my-certificates"] });
        }
      } catch {
        // El progreso es best-effort: un fallo puntual no debe interrumpir la clase.
      }
    },
    [chapterId, queryClient, router, slug],
  );

  // Guarda la última posición al salir de la clase o cerrar la pestaña.
  useEffect(() => {
    const flush = () => {
      if (Math.round(latestPosition.current) !== lastSentPosition.current) void save(latestPosition.current);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [save]);

  return (
    <StreamPlayer
      chapterId={chapterId}
      startTime={startTime}
      autoplay
      className="w-full"
      onTimeUpdate={(position) => {
        latestPosition.current = position;
        if (Date.now() - lastSentAt.current >= SAVE_INTERVAL_MS) void save(position);
      }}
      onPause={(position) => {
        latestPosition.current = position;
        void save(position);
      }}
      onEnded={(position) => {
        latestPosition.current = position;
        void save(position || durationSec, true);
        onEnded?.();
      }}
    />
  );
}
