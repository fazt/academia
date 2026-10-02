"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { OrderStatusBadge } from "@/components/admin/badges";
import { ConfirmAction } from "@/components/admin/confirm-button";
import { CopyEmail } from "@/components/admin/data-table";
import { money } from "@/components/admin/money";
import { NotFoundState } from "@/components/admin/not-found-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, call, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-all">{children}</dd>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => call(api.admin.orders[":id"].$get({ param: { id } })),
  });

  if (order.isLoading) return <AdminPageSkeleton />;
  if (!order.data) {
    return <NotFoundState error={order.error} title="Orden no encontrada" backHref="/admin/ordenes" backLabel="Volver a órdenes" />;
  }

  const data = order.data;
  const charged = data.amountPaidCents ?? data.totalCents;

  const refund = async () => {
    try {
      await call(api.admin.orders[":id"].refund.$post({ param: { id } }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "order", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
      ]);
      toast.success("Orden reembolsada y acceso revocado");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backHref="/admin/ordenes"
        backLabel="Órdenes"
        title={
          <span className="flex flex-wrap items-center gap-3">
            Orden #{data.id.slice(0, 8).toUpperCase()} <OrderStatusBadge status={data.status} />
          </span>
        }
        description={`Creada el ${formatDateTime(data.createdAt)}`}
        actions={
          data.status === "paid" && (
            <ConfirmAction
              destructive
              title="¿Reembolsar esta orden?"
              description={
                charged > 0
                  ? `Stripe devolverá ${money(charged, data.currency)} al cliente y se revocará el acceso a los cursos de la orden.`
                  : "La orden no tuvo cobro; solo se revocará el acceso a los cursos."
              }
              confirmLabel="Reembolsar"
              onConfirm={refund}
              trigger={
                <Button variant="destructive">
                  <RotateCcw /> Reembolsar
                </Button>
              }
            />
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Cursos</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Curso</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead className="pr-6 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.courseId}>
                  <TableCell className="pl-6 font-medium">
                    <Link href={`/admin/cursos/${item.courseId}`} className="hover:text-primary">
                      {item.courseTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(item.priceCents, data.currency)}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {item.discountCents ? `−${money(item.discountCents, data.currency)}` : "—"}
                  </TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">
                    {money(item.priceCents - item.discountCents, data.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="space-y-1 border-t px-6 py-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{money(data.subtotalCents, data.currency)}</span>
            </div>
            {data.discountCents > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Descuento {data.couponCode && <span className="font-mono">({data.couponCode})</span>}
                </span>
                <span className="tabular-nums">−{money(data.discountCents, data.currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-heading text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{money(data.totalCents, data.currency)}</span>
            </div>
            {data.amountPaidCents !== null && data.amountPaidCents !== data.totalCents && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Stripe cobró {money(data.amountPaidCents, data.currency)}.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link href={`/admin/usuarios/${data.user.id}`} className="font-medium hover:text-primary">
                {data.user.name}
              </Link>
              <CopyEmail email={data.user.email} className="text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pago</CardTitle>
              <CardDescription>Referencias para buscar el pago en Stripe.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label="Pagada">{formatDateTime(data.paidAt)}</Row>
                {data.refundedAt && <Row label="Reembolsada">{formatDateTime(data.refundedAt)}</Row>}
                <Row label="Cobrado">{data.amountPaidCents !== null ? money(data.amountPaidCents, data.currency) : "—"}</Row>
                <Row label="Sesión de checkout">
                  <span className="font-mono text-xs">{data.stripeCheckoutSessionId ?? "—"}</span>
                </Row>
                <Row label="Payment intent">
                  <span className="font-mono text-xs">{data.stripePaymentIntentId ?? "—"}</span>
                </Row>
              </dl>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">
                Los reembolsos parciales hechos desde Stripe no revocan el acceso automáticamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
