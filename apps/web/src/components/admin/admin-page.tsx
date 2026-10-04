import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Prompt } from "@/components/layout/term";
import { cn } from "@/lib/utils";

/** Cabecera de página del panel: antetítulo con forma de comando y título en monoespaciada. */
export function AdminPageHeader({
  title,
  command,
  description,
  actions,
  backHref,
  backLabel = "Volver",
}: {
  title: React.ReactNode;
  command?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 rounded font-term text-[13px] text-term-muted transition-colors hover:text-term-text focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none"
        >
          <ArrowLeft className="size-3.5" /> {backLabel.toLowerCase()}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {command && <Prompt className="truncate">{command}</Prompt>}
          <h1 className="font-term text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-extrabold tracking-[-0.02em] text-balance">
            {title}
          </h1>
          {description && <p className="text-sm text-term-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Tablas con el aire de la portada: cabeceras en monoespaciada pequeña y apagada sobre una franja elevada. */
export const adminTableClass =
  "[&_th]:h-10 [&_th]:font-term [&_th]:text-xs [&_th]:font-medium [&_th]:text-term-muted [&_thead]:bg-term-raised";

/** Contenedor de tabla con borde y toolbar/paginación alrededor. */
export function TableCard({
  toolbar,
  footer,
  children,
  className,
}: {
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {toolbar}
      <div
        className={cn(
          "overflow-hidden rounded-[14px] border border-term-border bg-term-surface [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3",
          adminTableClass,
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
