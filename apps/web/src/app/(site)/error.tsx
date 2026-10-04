"use client";

import { RefreshCw } from "lucide-react";
import { Container } from "@/components/layout/page-header";
import { TermPanel } from "@/components/layout/term";
import { Button } from "@/components/ui/button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="flex flex-1 flex-col justify-center gap-6 py-20">
      <TermPanel title="bash" className="w-full max-w-[560px]">
        <div className="p-4 font-term text-[13px] leading-[1.8]">
          <div>
            <span className="text-term-accent">$</span> academia open
          </div>
          <div className="text-destructive">error: no se pudo cargar la página</div>
          {error.digest && <div className="break-all text-term-muted">digest: {error.digest}</div>}
        </div>
      </TermPanel>
      <h1 className="font-term text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight font-extrabold tracking-[-0.02em]">
        Algo salió mal
      </h1>
      <p className="max-w-[540px] text-term-muted">
        No pudimos cargar esta página. Comprueba tu conexión e inténtalo de nuevo.
      </p>
      <div>
        <Button size="lg" onClick={reset}>
          <RefreshCw /> reintentar
        </Button>
      </div>
    </Container>
  );
}
