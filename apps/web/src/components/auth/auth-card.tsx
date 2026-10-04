import { TermPanel } from "@/components/layout/term";

/** Tarjeta de las páginas de acceso: un panel de terminal con el nombre del "script" en la barra. */
export function AuthCard({
  title,
  description,
  children,
  footer,
  file = "academia.sh",
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Nombre que se muestra en la barra del panel, p. ej. "login.sh". */
  file?: string;
}) {
  return (
    <TermPanel title={file} className="shadow-[0_40px_80px_-48px_rgba(0,0,0,0.25)] dark:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col gap-6 p-6 sm:p-7">
        <header className="flex flex-col gap-2">
          <h1 className="font-term text-2xl leading-tight font-extrabold tracking-[-0.02em] text-balance">{title}</h1>
          {description && <p className="text-sm text-term-muted">{description}</p>}
        </header>
        {children}
      </div>
      {footer && (
        <div className="border-t border-term-border px-6 py-4 text-center text-sm text-term-muted sm:px-7">{footer}</div>
      )}
    </TermPanel>
  );
}

/** Enlace de acción dentro de las tarjetas de acceso ("inicia sesión →"). */
export const authLinkClass =
  "font-term text-term-accent underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none";
