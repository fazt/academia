import Link from "next/link";
import { TermSection } from "@/components/layout/term";

export function FinalCta({ freeCourse }: { freeCourse: { title: string } | null }) {
  return (
    <TermSection>
      <div className="flex flex-wrap items-center justify-between gap-8 py-4">
        <div className="flex flex-col gap-3">
          <p className="font-term text-[clamp(2.5rem,6vw,4.75rem)] leading-none font-extrabold tracking-[-0.03em]">
            <span className="text-term-accent">$</span> academia start
            <span aria-hidden className="ml-[0.15em] inline-block h-[0.9em] w-[0.5em] translate-y-[0.08em] bg-term-accent motion-safe:animate-pulse" />
          </p>
          <p className="text-lg text-term-muted">
            {freeCourse
              ? `Empieza por ${freeCourse.title}: es gratis y solo necesitas un email.`
              : "Crea tu cuenta: solo necesitas un email."}
          </p>
        </div>
        <Link
          href="/registro"
          className="rounded-[10px] bg-term-accent px-[26px] py-[17px] font-term text-base font-bold text-term-bg transition-opacity hover:opacity-90"
        >
          crear cuenta gratis
        </Link>
      </div>
    </TermSection>
  );
}
