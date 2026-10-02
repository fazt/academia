"use client";

import type { CouponType } from "@academia/shared";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { AdminPageHeader, TableCard } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { StatusPill } from "@/components/admin/badges";
import { ConfirmAction } from "@/components/admin/confirm-button";
import {
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
import { useAdminOptions } from "@/components/admin/use-admin-options";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, call, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const FILTERS = ["active", "type"] as const;
const COLUMNS = 7;

function CouponsTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const table = useTableParams(FILTERS);
  const options = useAdminOptions();
  const currency = options.data?.currency ?? "USD";
  const query = {
    ...table.baseQuery,
    ...compact({ active: table.filters.active, type: table.filters.type }),
  } as typeof table.baseQuery & { active?: "true" | "false"; type?: CouponType };

  const coupons = useQuery({
    queryKey: ["admin", "coupons", query],
    queryFn: () => call(api.admin.coupons.$get({ query })),
    placeholderData: keepPreviousData,
  });

  const remove = async (id: string) => {
    try {
      await call(api.admin.coupons[":id"].$delete({ param: { id } }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success("Cupón eliminado");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cupones"
        description="Códigos de descuento que los alumnos aplican en el carrito."
        actions={
          <Button asChild>
            <Link href="/admin/cupones/nuevo">
              <Plus /> Nuevo cupón
            </Link>
          </Button>
        }
      />
      <TableCard
        toolbar={
          <TableToolbar table={table} placeholder="Buscar por código…">
            <FilterSelect
              label="Estado"
              value={table.filters.active}
              onChange={(active) => table.setParams({ active })}
              options={[
                { value: "true", label: "Activos" },
                { value: "false", label: "Inactivos" },
              ]}
            />
            <FilterSelect
              label="Tipo"
              value={table.filters.type}
              onChange={(type) => table.setParams({ type })}
              options={[
                { value: "percent", label: "Porcentaje" },
                { value: "amount", label: "Importe fijo" },
              ]}
            />
          </TableToolbar>
        }
        footer={coupons.data && <TablePagination table={table} total={coupons.data.total} pageCount={coupons.data.pageCount} />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead table={table} column="code">
                Código
              </SortableHead>
              <SortableHead table={table} column="value">
                Descuento
              </SortableHead>
              <TableHead>Aplica a</TableHead>
              <SortableHead table={table} column="redemptionsCount" className="text-right">
                Usos
              </SortableHead>
              <SortableHead table={table} column="expiresAt">
                Caduca
              </SortableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : coupons.error ? (
              <TableErrorRow columns={COLUMNS} message={errorMessage(coupons.error)} onRetry={() => coupons.refetch()} />
            ) : !coupons.data?.items.length ? (
              <TableEmptyRow
                columns={COLUMNS}
                icon={<TicketPercent />}
                title="No hay cupones"
                description={table.q || table.filters.active || table.filters.type ? "Prueba con otros filtros." : "Crea un cupón para tu próxima campaña."}
              />
            ) : (
              coupons.data.items.map((coupon) => {
                const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                const exhausted = coupon.maxRedemptions !== null && coupon.redemptionsCount >= coupon.maxRedemptions;
                return (
                  <TableRow key={coupon.id} className="cursor-pointer" onClick={() => router.push(`/admin/cupones/${coupon.id}`)}>
                    <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                    <TableCell className="tabular-nums">
                      {coupon.type === "percent" ? `${coupon.value} %` : money(coupon.value, currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {coupon.appliesToAll ? "Todos los cursos" : `${coupon.coursesCount} ${coupon.coursesCount === 1 ? "curso" : "cursos"}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {coupon.redemptionsCount}
                      <span className="text-muted-foreground"> / {coupon.maxRedemptions ?? "∞"}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{coupon.expiresAt ? formatDateTime(coupon.expiresAt) : "Nunca"}</TableCell>
                    <TableCell>
                      {!coupon.active ? (
                        <StatusPill>Inactivo</StatusPill>
                      ) : expired ? (
                        <StatusPill tone="warning">Caducado</StatusPill>
                      ) : exhausted ? (
                        <StatusPill tone="warning">Agotado</StatusPill>
                      ) : (
                        <StatusPill tone="success">Activo</StatusPill>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/admin/cupones/${coupon.id}`} aria-label={`Editar ${coupon.code}`}>
                            <Pencil />
                          </Link>
                        </Button>
                        <ConfirmAction
                          destructive
                          title={`¿Borrar el cupón ${coupon.code}?`}
                          description="Las órdenes que ya lo usaron conservan su descuento."
                          confirmLabel="Borrar"
                          onConfirm={() => remove(coupon.id)}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Borrar ${coupon.code}`}>
                              <Trash2 />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}

export default function AdminCouponsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <CouponsTable />
    </Suspense>
  );
}
