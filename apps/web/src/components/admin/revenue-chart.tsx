"use client";

import { useState } from "react";
import { money } from "@/components/admin/money";
import { cn } from "@/lib/utils";

interface Point {
  day: string;
  revenueCents: number;
  sales: number;
}

const dayLabel = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });

/** Barras de ingresos diarios en SVG/CSS, sin librerías de gráficos. */
export function RevenueChart({ series, currency }: { series: Point[]; currency: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...series.map((p) => p.revenueCents), 1);
  const active = hovered !== null ? series[hovered] : null;
  const total = series.reduce((sum, p) => sum + p.revenueCents, 0);

  return (
    <div className="space-y-3">
      <div className="flex min-h-10 items-baseline justify-between gap-2">
        {active ? (
          <p className="text-sm">
            <span className="font-medium">{dayLabel.format(new Date(`${active.day}T12:00:00`))}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-heading text-lg font-bold">{money(active.revenueCents, currency)}</span>
            <span className="text-muted-foreground"> · {active.sales} {active.sales === 1 ? "venta" : "ventas"}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pasa el cursor sobre una barra para ver el detalle del día.
          </p>
        )}
      </div>
      <div
        className="relative flex h-48 items-end gap-[3px] border-b border-dashed"
        role="img"
        aria-label={`Ingresos de los últimos 30 días: ${money(total, currency)}`}
        onMouseLeave={() => setHovered(null)}
      >
        {[0.25, 0.5, 0.75].map((ratio) => (
          <div
            key={ratio}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/60"
            style={{ bottom: `${ratio * 100}%` }}
            aria-hidden
          />
        ))}
        {series.map((point, index) => {
          const height = point.revenueCents === 0 ? 0 : Math.max(4, (point.revenueCents / max) * 100);
          return (
            <button
              key={point.day}
              type="button"
              className="group relative flex h-full flex-1 items-end focus-visible:outline-none"
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              aria-label={`${point.day}: ${money(point.revenueCents, currency)}, ${point.sales} ventas`}
            >
              <span
                className={cn(
                  "w-full rounded-t-[3px] bg-chart-1/70 transition-colors group-hover:bg-chart-1 group-focus-visible:bg-chart-1",
                  point.revenueCents === 0 && "h-[2px]! bg-muted-foreground/20",
                  hovered === index && "bg-chart-1",
                )}
                style={{ height: `${height}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{series[0] ? dayLabel.format(new Date(`${series[0].day}T12:00:00`)) : ""}</span>
        <span>Hoy</span>
      </div>
    </div>
  );
}

