"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Clock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/page-header";
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
          <div className="mb-5 grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CircleCheck className="size-8" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">¡Gracias por tu compra!</h1>
          <p className="mt-2 text-muted-foreground">Ya tienes acceso. Te enviamos el recibo por email.</p>
          <ul className="mt-8 w-full divide-y rounded-xl border text-left">
            {order.data?.items.map((item) => (
              <li key={item.courseId} className="flex items-center justify-between gap-4 p-4">
                <span className="font-medium">{item.title}</span>
                <Button size="sm" asChild>
                  <Link href={`/aprender/${item.slug}`}>
                    <PlayCircle /> Empezar
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="link" asChild className="mt-4">
            <Link href="/mis-cursos">Ir a mis cursos</Link>
          </Button>
        </>
      ) : timedOut || order.isError || !sessionId ? (
        <>
          <div className="mb-5 grid size-16 place-items-center rounded-full bg-amber-500/10 text-amber-600">
            <Clock className="size-8" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Estamos confirmando tu pago</h1>
          <p className="mt-2 text-muted-foreground">
            Puede tardar unos minutos. En cuanto se confirme tendrás acceso y te avisaremos por email.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild>
              <Link href="/mis-compras">Ver mis compras</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/mis-cursos">Mis cursos</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <Spinner className="mb-5 size-8 text-primary" />
          <h1 className="font-heading text-2xl font-bold">Confirmando tu pago…</h1>
          <p className="mt-2 text-muted-foreground">No cierres esta página, solo tarda unos segundos.</p>
        </>
      )}
    </Container>
  );
}
