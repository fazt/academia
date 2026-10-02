import { SectionTitle, TermPanel, TermSection } from "@/components/landing/section-title";

const line = "whitespace-pre-wrap break-words font-term text-[13px] leading-[1.8]";

export function Classroom({ courseTitle }: { courseTitle: string | null }) {
  return (
    <TermSection id="aula">
      <SectionTitle command="man aula" />
      <div className="grid gap-5 lg:grid-cols-3">
        <article className="flex flex-col gap-3.5">
          <TermPanel title="progreso.log">
            <div className="p-4" aria-hidden>
              <div className={`${line} text-term-muted`}>
                clase 3 · completada <span className="text-term-ok">✓</span>
              </div>
              <div className={`${line} text-term-muted`}>clase 4 · 03:12 / 05:56</div>
              <div className={line}>
                <span className="text-term-accent">reanudar →</span> clase 4 en 03:12
              </div>
            </div>
          </TermPanel>
          <h3 className="text-[21px] font-semibold">Retomas en el segundo exacto</h3>
          <p className="text-term-muted">
            Tu posición se guarda en cada video, en cualquier dispositivo. Cada clase completada suma a tu avance.
          </p>
        </article>

        <article className="flex flex-col gap-3.5">
          <TermPanel title="preguntas/clase-3">
            <div className="flex flex-col gap-2.5 p-4 text-sm" aria-hidden>
              <div>
                <span className="font-term text-term-muted">alumno</span> ¿Qué versión de Node uso?
              </div>
              <div className="border-l-2 border-term-border pl-4">
                <span className="font-term text-term-accent">instructor</span> Cualquier LTS reciente.
              </div>
            </div>
          </TermPanel>
          <h3 className="text-[21px] font-semibold">Preguntas dentro de cada clase</h3>
          <p className="text-term-muted">
            Las dudas viven junto al video que las provocó. Cuando el instructor responde, te llega un email.
          </p>
        </article>

        <article className="flex flex-col gap-3.5">
          <TermPanel title="certificado.json">
            <div className="p-4" aria-hidden>
              <div className={line}>{"{"}</div>
              <div className={line}>
                {"  "}
                <span className="text-term-key">&quot;estudiante&quot;</span>:{" "}
                <span className="text-term-accent">&quot;Tu nombre&quot;</span>,
              </div>
              <div className={line}>
                {"  "}
                <span className="text-term-key">&quot;curso&quot;</span>:{" "}
                <span className="text-term-accent">&quot;{courseTitle ?? "Tu curso"}&quot;</span>,
              </div>
              <div className={line}>
                {"  "}
                <span className="text-term-key">&quot;codigo&quot;</span>:{" "}
                <span className="text-term-accent">&quot;XXXXX-XXXXX&quot;</span>,
              </div>
              <div className={line}>
                {"  "}
                <span className="text-term-key">&quot;verificable&quot;</span>: <span className="text-term-num">true</span>
              </div>
              <div className={line}>{"}"}</div>
            </div>
          </TermPanel>
          <h3 className="text-[21px] font-semibold">Certificado verificable</h3>
          <p className="text-term-muted">
            Se emite solo al completar el curso, en PDF y con una página pública que cualquiera puede comprobar.
          </p>
        </article>
      </div>
    </TermSection>
  );
}
