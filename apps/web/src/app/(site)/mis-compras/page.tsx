"use client";

import { ORDER_STATUS_LABELS, type OrderStatus } from "@academia/shared";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/layout/page-header";
import { TermPanel } from "@/components/layout/term";
import type { MyOrder } from "@/components/learn/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call, errorMessage } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<OrderStatus, string> = {
  paid: "bg-term-ok/10 text-term-ok",
  pending: "bg-term-num/10 text-term-num",
  failed: "bg-destructive/10 text-destructive",
  expired: "bg-term-raised text-term-muted",
  refunded: "bg-term-key/10 text-term-key",
  disputed: "bg-destructive/10 text-destructive",
};

function OrderCard({ order }: { order: MyOrder }) {
  const total = order.amountPaidCents ?? order.totalCents;
  return (
    <TermPanel
      title={
        <>
          pedido <span className="text-term-text">#{order.id.slice(0, 8).toUpperCase()}</span> ·{" "}
          {formatDateTime(order.paidAt ?? order.createdAt)}
        </>
      }
      aside={
        <Badge className={cn("shrink-0 border-transparent", STATUS_STYLES[order.status])}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      }
    >
      <ul className="divide-y divide-term-border">
        {order.items.map((item) => (
          <li key={item.courseId} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
            <Link
              href={`/cursos/${item.slug}`}
              className="font-medium underline-offset-4 hover:text-term-accent hover:underline"
            >
              {item.courseTitle}
            </Link>
            <span className="shrink-0 text-right font-term text-[13px]">
              {item.discountCents > 0 && (
                <span className="mr-2 text-term-muted line-through">{formatPrice(item.priceCents, order.currency)}</span>
              )}
              {formatPrice(item.priceCents - item.discountCents, order.currency)}
            </span>
          </li>
        ))}
      </ul>
      <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-term-border px-5 py-4">
        <div className="font-term text-[13px] text-term-muted">
          {order.couponCode && (
            <>
              cupón <span className="text-term-accent">{order.couponCode}</span>
            </>
          )}
        </div>
        <dl className="grid grid-cols-[auto_auto] items-baseline gap-x-6 gap-y-1 text-right font-term text-[13px]">
          {order.discountCents > 0 && (
            <>
              <dt className="text-term-muted">subtotal</dt>
              <dd>{formatPrice(order.subtotalCents, order.currency)}</dd>
              <dt className="text-term-muted">descuento</dt>
              <dd className="text-term-ok">−{formatPrice(order.discountCents, order.currency)}</dd>
            </>
          )}
          <dt className="text-term-muted">total</dt>
          <dd className="text-[19px] font-extrabold">{total === 0 ? "gratis" : formatPrice(total, order.currency)}</dd>
        </dl>
      </footer>
    </TermPanel>
  );
}

export default function MyOrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => call(api.me.orders.$get()),
  });
  const orders = data?.items ?? [];

  return (
    <Container className="flex flex-col gap-10 py-12">
      <PageHeader command="cat mis-compras.log" title="Mis compras" description="Historial de pedidos y recibos." />
      <div className="max-w-[860px]">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-[14px]" />
            ))}
          </div>
        ) : error ? (
          <Empty className="rounded-[14px] border border-term-border">
            <EmptyHeader>
              <EmptyTitle>No se pudieron cargar tus compras</EmptyTitle>
              <EmptyDescription>{errorMessage(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : orders.length === 0 ? (
          <Empty className="rounded-[14px] border border-dashed border-term-border-strong p-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Receipt />
              </EmptyMedia>
              <EmptyTitle>Aún no has comprado nada</EmptyTitle>
              <EmptyDescription>Cuando compres un curso, tu recibo aparecerá aquí.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/cursos">explorar cursos →</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
