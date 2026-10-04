import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({ value, className, size = "sm" }: { value: number; className?: string; size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "size-3.5" : "size-5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className={cn("relative", iconSize)}>
            <Star className={cn("absolute inset-0 text-star/30", iconSize)} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("text-star", iconSize)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function RatingSummary({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span className="font-term text-xs text-term-muted">sin valoraciones aún</span>;
  return (
    <span className="inline-flex items-center gap-1.5 font-term text-[13px]">
      <span className="font-bold text-term-num">{avg.toFixed(1)}</span>
      <RatingStars value={avg} />
      <span className="text-term-muted">({count})</span>
    </span>
  );
}
