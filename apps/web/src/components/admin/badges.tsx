import {
  COURSE_STATUS_LABELS,
  type CourseStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  VIDEO_STATUS_LABELS,
  type VideoStatus,
} from "@academia/shared";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

// Colores de la paleta Terminal: ok, número (pendiente), clave (info) y acento.
const TONES: Record<Tone, string> = {
  neutral: "bg-term-raised text-term-muted ring-term-border",
  success: "bg-term-ok/10 text-term-ok ring-term-ok/30",
  warning: "bg-term-num/10 text-term-num ring-term-num/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/30",
  info: "bg-term-key/10 text-term-key ring-term-key/30",
  primary: "bg-term-accent/10 text-term-accent ring-term-accent/30",
};

export function StatusPill({
  tone = "neutral",
  children,
  className,
  dot = true,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-term text-[11px] font-medium whitespace-nowrap lowercase ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const COURSE_TONES: Record<CourseStatus, Tone> = { draft: "neutral", published: "success", archived: "warning" };

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return <StatusPill tone={COURSE_TONES[status]}>{COURSE_STATUS_LABELS[status]}</StatusPill>;
}

const ORDER_TONES: Record<OrderStatus, Tone> = {
  pending: "warning",
  paid: "success",
  failed: "danger",
  expired: "neutral",
  refunded: "info",
  disputed: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusPill tone={ORDER_TONES[status]}>{ORDER_STATUS_LABELS[status]}</StatusPill>;
}

const VIDEO_TONES: Record<VideoStatus, Tone> = {
  none: "neutral",
  uploading: "info",
  processing: "warning",
  ready: "success",
  error: "danger",
};

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  return <StatusPill tone={VIDEO_TONES[status]}>{VIDEO_STATUS_LABELS[status]}</StatusPill>;
}
