import { Container, PageHeader } from "@/components/layout/page-header";

/** Texto legal presentado como un `cat archivo.md`: títulos de sección con "##". */
export function LegalPage({
  title,
  updated,
  sections,
  file,
}: {
  title: string;
  updated: string;
  sections: { heading: string; paragraphs: string[] }[];
  /** Nombre del archivo del antetítulo, p. ej. "terminos.md". */
  file?: string;
}) {
  return (
    <Container className="flex flex-col gap-10 py-12">
      <PageHeader
        command={file ? `cat ${file}` : undefined}
        title={title}
        description={<span className="font-term text-[13px]">última actualización: {updated}</span>}
      />
      <div className="flex max-w-[860px] flex-col gap-8 border-t border-term-border pt-8">
        {sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="font-term text-lg font-bold">
              <span aria-hidden className="text-term-accent">
                ##{" "}
              </span>
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-term-text/85">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Container>
  );
}
