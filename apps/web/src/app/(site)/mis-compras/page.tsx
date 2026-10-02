"use client";

import { ORDER_STATUS_LABELS, type OrderStatus } from "@academia/shared";
import { useQuery } from "@tanstack/react-query";
import { Receipt, TicketPercent } from "lucide-react";
import Link from "next/link";
import { Container, PageHeader } from "@/components/layout/page-header";
import type { MyOrder } from "@/components/learn/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call, errorMessage } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<OrderStatus, string> = {
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  failed: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
  refunded: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  disputed: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

function OrderCard({ order }: { order: MyOrder }) {
  const total = order.amountPaidCents ?? order.totalCents;
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
          <span className="text-muted-foreground">{formatDateTime(order.paidAt ?? order.createdAt)}</span>
        </div>
        <Badge className={cn("border-transparent", STATUS_STYLES[order.status])}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </header>
      <ul className="divide-y">
        {order.items.map((item) => (
          <li key={item.courseId} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
            <Link href={`/cursos/${item.slug}`} className="font-medium hover:text-primary">
              {item.courseTitle}
            </Link>
            <span className="shrink-0 text-right">
              {item.discountCents > 0 && (
                <span className="mr-2 text-xs text-muted-foreground line-through">
                  {formatPrice(item.priceCents, order.currency)}
                </span>
              )}
              {formatPrice(item.priceCents - item.discountCents, order.currency)}
            </span>
          </li>
        ))}
      </ul>
      <Separator />
      <footer className="flex flex-wrap items-end justify-between gap-4 px-5 py-4 text-sm">
        <div>
          {order.couponCode && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <TicketPercent className="size-4" /> Cupón <span className="font-mono font-medium">{order.couponCode}</span>
            </span>
          )}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-right">
          {order.discountCents > 0 && (
            <>
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(order.subtotalCents, order.currency)}</dd>
              <dt className="text-muted-foreground">Descuento</dt>
              <dd className="text-emerald-700 dark:text-emerald-400">
                −{formatPrice(order.discountCents, order.currency)}
              </dd>
            </>
          )}
          <dt className="font-semibold">Total</dt>
          <dd className="font-heading font-bold">{total === 0 ? "Gratis" : formatPrice(total, order.currency)}</dd>
        </dl>
      </footer>
    </article>
  );
}

export default function MyOrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => call(api.me.orders.$get()),
  });
  const orders = data?.items ?? [];

  return (
    <Container className="max-w-4xl space-y-8 py-10">
      <PageHeader title="Mis compras" description="Historial de pedidos y recibos." />
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No se pudieron cargar tus compras</EmptyTitle>
            <EmptyDescription>{errorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : orders.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>Aún no has comprado nada</EmptyTitle>
            <EmptyDescription>Cuando compres un curso, tu recibo aparecerá aquí.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/cursos">Explorar cursos</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </Container>
  );
}
