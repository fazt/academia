import { cn } from "@/lib/utils";

/**
 * Piezas de la dirección visual "Terminal", compartidas por la portada y el resto del sitio.
 */

/** Línea de comando corta: "$ ls cursos/". Sirve de antetítulo o de etiqueta. */
export function Prompt({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-term text-[13px] text-term-muted", className)}>
      <span className="text-term-accent">$</span> {children}
    </span>
  );
}

/** Título de sección con forma de comando: "$ ls cursos/". */
export function SectionTitle({
  command,
  aside,
  className,
  as: Heading = "h2",
}: {
  command: string;
  aside?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-3", className)}>
      <Heading className="font-term text-[clamp(1.875rem,3.4vw,2.625rem)] font-extrabold tracking-[-0.02em]">
        <span className="text-term-accent">$</span> {command}
      </Heading>
      {aside && <span className="font-term text-[13px] text-term-muted">{aside}</span>}
    </div>
  );
}

export function TermSection({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("border-t border-term-border", className)}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-[72px] sm:px-10">{children}</div>
    </section>
  );
}

/** Panel con barra de título, como una ventana de editor o terminal. */
export function TermPanel({
  title,
  aside,
  children,
  className,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[14px] border border-term-border bg-term-surface", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-term-border px-3.5 py-2.5 font-term text-xs text-term-muted">
        <span className="min-w-0 truncate">{title}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}
