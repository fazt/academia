"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Clock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/page-header";
import { Prompt, TermPanel } from "@/components/layout/term";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, call } from "@/lib/api";

/** Tiempo máximo esperando al webhook de Stripe antes de mostrar "pendiente". */
const MAX_WAIT_MS = 45_000;

export function CheckoutSuccess() {
  const sessionId = useSearchParams().get("session_id") ?? "";
  const queryClient = useQueryClient();
  const [waitedTooLong, setWaitedTooLong] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaitedTooLong(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  const order = useQuery({
    queryKey: ["order-by-session", sessionId],
    queryFn: () => call(api.me.orders["by-session"][":sessionId"].$get({ param: { sessionId } })),
    enabled: !!sessionId,
    // El webhook puede tardar unos segundos: se consulta hasta que la orden esté pagada.
    refetchInterval: (query) => (query.state.data?.status === "paid" || waitedTooLong ? false : 2000),
  });

  const paid = order.data?.status === "paid";

  useEffect(() => {
    if (!paid) return;
    void queryClient.invalidateQueries({ queryKey: ["library"] });
    void queryClient.invalidateQueries({ queryKey: ["cart"] });
  }, [paid, queryClient]);

  const timedOut = !paid && waitedTooLong;

  return (
    <Container className="flex max-w-xl flex-col items-center py-20 text-center">
      {paid ? (
        <>
          <div className="mb-5 grid size-16 place-items-center rounded-full bg-term-ok/10 text-term-ok">
            <CircleCheck className="size-8" />
          </div>
          <Prompt>checkout --estado=pagado</Prompt>
          <h1 className="mt-2 font-term text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight font-extrabold tracking-[-0.02em]">
            ¡Gracias por tu compra!
          </h1>
          <p className="mt-2 text-term-muted">Ya tienes acceso. Te enviamos el recibo por email.</p>
          <TermPanel title="recibo.txt" className="mt-8 w-full text-left">
            <ul className="divide-y divide-term-border">
              {order.data?.items.map((item) => (
                <li key={item.courseId} className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="font-semibold">{item.title}</span>
                  <Button size="sm" asChild>
                    <Link href={`/aprender/${item.slug}`}>
                      <PlayCircle /> empezar
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </TermPanel>
          <Link href="/mis-cursos" className="mt-5 font-term text-[13px] text-term-accent hover:underline">
            ir a mis cursos →
          </Link>
        </>
      ) : timedOut || order.isError || !sessionId ? (
        <>
          <div className="mb-5 grid size-16 place-items-center rounded-full bg-term-num/10 text-term-num">
            <Clock className="size-8" />
          </div>
          <Prompt>checkout --estado=pendiente</Prompt>
          <h1 className="mt-2 font-term text-2xl font-extrabold tracking-[-0.02em]">Estamos confirmando tu pago</h1>
          <p className="mt-2 text-term-muted">
            Puede tardar unos minutos. En cuanto se confirme tendrás acceso y te avisaremos por email.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild>
              <Link href="/mis-compras">ver mis compras</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/mis-cursos">mis cursos</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <Spinner className="mb-5 size-8 text-term-accent" />
          <Prompt>checkout --esperar</Prompt>
          <h1 className="mt-2 font-term text-2xl font-extrabold tracking-[-0.02em]">Confirmando tu pago…</h1>
          <p className="mt-2 text-term-muted">No cierres esta página, solo tarda unos segundos.</p>
        </>
      )}
    </Container>
  );
}
