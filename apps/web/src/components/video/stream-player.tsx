"use client";

import { Stream, type StreamPlayerApi } from "@cloudflare/stream-react";
import { useQuery } from "@tanstack/react-query";
import { Lock, VideoOff } from "lucide-react";
import { useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api, call } from "@/lib/api";
import { cn } from "@/lib/utils";

interface StreamPlayerProps {
  chapterId: string;
  /** Segundo desde el que empezar (reanudar). */
  startTime?: number;
  autoplay?: boolean;
  className?: string;
  onTimeUpdate?: (positionSec: number) => void;
  onPause?: (positionSec: number) => void;
  onEnded?: (positionSec: number) => void;
  /** Contenido a mostrar si el usuario no tiene acceso (por ejemplo, un botón de compra). */
  lockedAction?: React.ReactNode;
}

function Overlay({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-neutral-950 p-6 text-center text-neutral-100">
      <div className="grid size-12 place-items-center rounded-full bg-white/10">{icon}</div>
      <p className="max-w-sm text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

/**
 * Reproductor de Cloudflare Stream. Pide a la API un token firmado para el
 * capítulo; si el token caduca durante la reproducción, pide otro.
 */
export function StreamPlayer({
  chapterId,
  startTime,
  autoplay,
  className,
  onTimeUpdate,
  onPause,
  onEnded,
  lockedAction,
}: StreamPlayerProps) {
  const streamRef = useRef<StreamPlayerApi | undefined>(undefined);
  const refetchedAfterError = useRef(false);

  const playback = useQuery({
    queryKey: ["playback", chapterId],
    queryFn: () => call(api.chapters[":id"].playback.$get({ param: { id: chapterId } })),
    staleTime: 30 * 60 * 1000,
  });

  const currentTime = () => streamRef.current?.currentTime ?? 0;

  let content: React.ReactNode;
  if (playback.isLoading) {
    content = <Skeleton className="aspect-video w-full rounded-none" />;
  } else if (playback.error) {
    const status = playback.error instanceof ApiError ? playback.error.status : 0;
    if (status === 401 || status === 403) {
      content = (
        <Overlay icon={<Lock className="size-5" />} title="Inscríbete en el curso para ver este capítulo.">
          {lockedAction}
        </Overlay>
      );
    } else if (status === 404) {
      content = (
        <Overlay icon={<VideoOff className="size-5" />} title="El video de este capítulo todavía no está disponible." />
      );
    } else {
      content = (
        <Overlay
          icon={<VideoOff className="size-5" />}
          title={playback.error.message || "No se pudo cargar el video. Inténtalo de nuevo."}
        />
      );
    }
  } else if (playback.data) {
    content = (
      <Stream
        key={playback.data.token}
        src={playback.data.token}
        customerCode={playback.data.customerCode ?? undefined}
        streamRef={streamRef}
        controls
        responsive
        autoplay={autoplay}
        startTime={startTime && startTime > 5 ? Math.floor(startTime) : undefined}
        primaryColor="#6366f1"
        onTimeUpdate={() => onTimeUpdate?.(currentTime())}
        onPause={() => onPause?.(currentTime())}
        onEnded={() => onEnded?.(currentTime())}
        onPlaying={() => {
          refetchedAfterError.current = false;
        }}
        onError={() => {
          // Lo más probable es un token caducado: se pide uno nuevo una sola vez.
          if (!refetchedAfterError.current) {
            refetchedAfterError.current = true;
            void playback.refetch();
          }
        }}
      />
    );
  }

  return <div className={cn("overflow-hidden bg-neutral-950", className)}>{content}</div>;
}
