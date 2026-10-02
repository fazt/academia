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

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground ring-border",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-400",
  info: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-400",
  primary: "bg-primary/10 text-primary ring-primary/25",
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
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
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
