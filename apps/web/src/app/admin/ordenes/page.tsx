"use client";

import { ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "@academia/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader, TableCard } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { OrderStatusBadge } from "@/components/admin/badges";
import {
  CopyEmail,
  FilterSelect,
  SortableHead,
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
  TablePagination,
  TableToolbar,
  compact,
  useTableParams,
} from "@/components/admin/data-table";
import { money } from "@/components/admin/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, call, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const FILTERS = ["status"] as const;
const COLUMNS = 7;

function OrdersTable() {
  const router = useRouter();
  const table = useTableParams(FILTERS);
  const query = {
    ...table.baseQuery,
    ...compact({ status: table.filters.status }),
  } as typeof table.baseQuery & { status?: OrderStatus };

  const orders = useQuery({
    queryKey: ["admin", "orders", query],
    queryFn: () => call(api.admin.orders.$get({ query })),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Órdenes" command="ls ordenes/ --sort=fecha" description="Compras de los alumnos, pagos y reembolsos." />
      <TableCard
        toolbar={
          <TableToolbar table={table} placeholder="Buscar por cliente, email o nº de orden…">
            <FilterSelect
              label="Estado"
              value={table.filters.status}
              onChange={(status) => table.setParams({ status })}
              options={ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))}
            />
          </TableToolbar>
        }
        footer={orders.data && <TablePagination table={table} total={orders.data.total} pageCount={orders.data.pageCount} />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <SortableHead table={table} column="email" className="min-w-56">
                Cliente
              </SortableHead>
              <SortableHead table={table} column="status">
                Estado
              </SortableHead>
              <TableHead className="text-right">Cursos</TableHead>
              <SortableHead table={table} column="totalCents" className="text-right">
                Total
              </SortableHead>
              <SortableHead table={table} column="createdAt">
                Fecha
              </SortableHead>
              <TableHead className="w-10">
                <span className="sr-only">Abrir</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : orders.error ? (
              <TableErrorRow columns={COLUMNS} message={errorMessage(orders.error)} onRetry={() => orders.refetch()} />
            ) : !orders.data?.items.length ? (
              <TableEmptyRow
                columns={COLUMNS}
                icon={<Receipt />}
                title="No hay órdenes"
                description={table.q || table.filters.status ? "Prueba con otros filtros." : "Aquí verás las compras de tus alumnos."}
              />
            ) : (
              orders.data.items.map((order) => (
                <TableRow key={order.id} className="cursor-pointer" onClick={() => router.push(`/admin/ordenes/${order.id}`)}>
                  <TableCell className="font-term text-[13px] text-term-num">
                    <Link href={`/admin/ordenes/${order.id}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-72">
                    <p className="truncate font-medium">{order.user.name}</p>
                    <div className="text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                      <CopyEmail email={order.user.email} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right font-term text-[13px] tabular-nums">{order.itemsCount}</TableCell>
                  <TableCell className="text-right font-term text-[13px] tabular-nums">
                    {money(order.amountPaidCents ?? order.totalCents, order.currency)}
                    {order.couponCode && <p className="font-mono text-xs text-muted-foreground">{order.couponCode}</p>}
                  </TableCell>
                  <TableCell className="font-term text-[13px] text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <OrdersTable />
    </Suspense>
  );
}
