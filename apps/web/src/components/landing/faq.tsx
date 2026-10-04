import Link from "next/link";
import { SectionTitle, TermSection } from "@/components/layout/term";

const QUESTIONS: { flag: string; question: string; answer: React.ReactNode }[] = [
  {
    flag: "--acceso",
    question: "¿Cuánto tiempo tengo acceso a un curso?",
    answer: "De por vida. Pagas una vez y el curso queda en «Mis cursos», con las clases que se añadan después.",
  },
  {
    flag: "--prueba",
    question: "¿Puedo probar antes de comprar?",
    answer: "Sí: cada curso tiene clases de vista previa gratuitas y hay cursos completamente gratis.",
  },
  {
    flag: "--certificado",
    question: "¿Cómo consigo el certificado?",
    answer:
      "Al completar todas las clases se emite automáticamente, con un código que cualquiera puede verificar en línea.",
  },
  {
    flag: "--reembolso",
    question: "¿Y si el curso no es para mí?",
    answer: (
      <>
        Puedes pedir el reembolso según nuestra{" "}
        <Link href="/reembolsos" className="text-term-text underline underline-offset-4">
          política de reembolsos
        </Link>
        .
      </>
    ),
  },
];

export function Faq() {
  return (
    <TermSection id="faq">
      <SectionTitle command="academia --help" />
      <div className="max-w-[860px] border-t border-term-border">
        {QUESTIONS.map((item, index) => (
          <details key={item.flag} open={index === 0} className="group border-b border-term-border py-[18px]">
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              <span className="font-term text-[15px] text-term-accent">{item.flag}</span>
              <span className="flex-1">{item.question}</span>
              <span aria-hidden className="font-term text-term-muted group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <p className="mt-3 text-term-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </TermSection>
  );
}
