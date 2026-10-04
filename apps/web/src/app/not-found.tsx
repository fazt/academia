import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/page-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TermPanel } from "@/components/layout/term";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Container className="flex flex-1 flex-col justify-center gap-6 py-20">
          <TermPanel title="bash" className="w-full max-w-[560px]">
            <div className="p-4 font-term text-[13px] leading-[1.8]" aria-hidden>
              <div>
                <span className="text-term-accent">$</span> cd ./esta-pagina
              </div>
              <div className="text-term-muted">bash: cd: ./esta-pagina: No such file or directory</div>
              <div>
                <span className="text-term-accent">$</span> echo $?
              </div>
              <div className="text-term-num">404</div>
            </div>
          </TermPanel>
          <h1 className="font-term text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-extrabold tracking-[-0.03em] text-balance">
            No encontramos esta página
          </h1>
          <p className="max-w-[540px] text-lg text-term-muted">
            Puede que el enlace esté roto o que el curso ya no esté disponible.
          </p>
          <div className="flex flex-wrap gap-3 font-term text-[15px]">
            <Link
              href="/cursos"
              className="inline-flex items-center gap-2 rounded-[10px] bg-term-accent px-[22px] py-[15px] font-bold text-term-bg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:ring-offset-2 focus-visible:ring-offset-term-bg focus-visible:outline-none"
            >
              explorar cursos <ArrowRight className="size-[18px]" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-[10px] border border-term-border-strong px-[22px] py-[15px] font-medium transition-colors hover:bg-term-surface focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none"
            >
              ir al inicio
            </Link>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
