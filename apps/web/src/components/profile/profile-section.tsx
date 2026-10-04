import { TermPanel } from "@/components/layout/term";

/** Bloque del perfil: panel de terminal con nombre de archivo, título, descripción y pie de acciones. */
export function ProfileSection({
  file,
  title,
  description,
  children,
  footer,
}: {
  file: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <TermPanel title={file}>
      <div className="flex flex-col gap-5 p-6">
        <header className="flex flex-col gap-1">
          <h2 className="font-term text-lg font-extrabold tracking-[-0.01em]">{title}</h2>
          {description && <p className="text-sm text-term-muted">{description}</p>}
        </header>
        {children}
      </div>
      {footer && <div className="flex justify-end gap-2 border-t border-term-border px-6 py-4">{footer}</div>}
    </TermPanel>
  );
}
