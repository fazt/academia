import { Prompt } from "@/components/layout/term";
import { cn } from "@/lib/utils";

/**
 * Cabecera de página en la dirección "Terminal": antetítulo con forma de comando
 * (`$ ls mis-cursos/`) y el título en monoespaciada, como en la portada.
 */
export function PageHeader({
  title,
  command,
  description,
  actions,
  className,
}: {
  title: string;
  command?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {command && <Prompt>{command}</Prompt>}
        <h1 className="font-term text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight font-extrabold tracking-[-0.02em] text-balance">
          {title}
        </h1>
        {description && <p className="text-term-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-10", className)}>{children}</div>;
}
