"use client";

import type { UserRole } from "@academia/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader, TableCard } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { StatusPill } from "@/components/admin/badges";
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
import { UserAvatar } from "@/components/user-avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

const FILTERS = ["role"] as const;
const COLUMNS = 7;

function UsersTable() {
  const router = useRouter();
  const table = useTableParams(FILTERS);
  const query = {
    ...table.baseQuery,
    ...compact({ role: table.filters.role }),
  } as typeof table.baseQuery & { role?: UserRole };

  const users = useQuery({
    queryKey: ["admin", "users", query],
    queryFn: () => call(api.admin.users.$get({ query })),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Usuarios" command="ls usuarios/" description="Alumnos y administradores de la plataforma." />
      <TableCard
        toolbar={
          <TableToolbar table={table} placeholder="Buscar por nombre o email…">
            <FilterSelect
              label="Rol"
              value={table.filters.role}
              onChange={(role) => table.setParams({ role })}
              options={[
                { value: "student", label: "Alumno" },
                { value: "admin", label: "Administrador" },
              ]}
            />
          </TableToolbar>
        }
        footer={users.data && <TablePagination table={table} total={users.data.total} pageCount={users.data.pageCount} />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead table={table} column="name" className="min-w-52">
                Nombre
              </SortableHead>
              <SortableHead table={table} column="email">
                Email
              </SortableHead>
              <SortableHead table={table} column="role">
                Rol
              </SortableHead>
              <TableHead>Verificado</TableHead>
              <TableHead className="text-right">Cursos</TableHead>
              <SortableHead table={table} column="createdAt">
                Registro
              </SortableHead>
              <TableHead className="w-10">
                <span className="sr-only">Abrir</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : users.error ? (
              <TableErrorRow columns={COLUMNS} message={errorMessage(users.error)} onRetry={() => users.refetch()} />
            ) : !users.data?.items.length ? (
              <TableEmptyRow columns={COLUMNS} icon={<Users />} title="No hay usuarios" description="Prueba con otros filtros." />
            ) : (
              users.data.items.map((user) => (
                <TableRow key={user.id} className="cursor-pointer" onClick={() => router.push(`/admin/usuarios/${user.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={user.name} image={user.image} />
                      <Link
                        href={`/admin/usuarios/${user.id}`}
                        className="truncate font-medium hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {user.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64" onClick={(e) => e.stopPropagation()}>
                    <CopyEmail email={user.email} />
                  </TableCell>
                  <TableCell>
                    {user.role === "admin" ? <StatusPill tone="primary">Administrador</StatusPill> : <StatusPill>Alumno</StatusPill>}
                  </TableCell>
                  <TableCell>
                    {user.emailVerified ? (
                      <StatusPill tone="success" dot={false}>
                        Sí
                      </StatusPill>
                    ) : (
                      <StatusPill tone="warning" dot={false}>
                        No
                      </StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-term text-[13px] tabular-nums">{formatNumber(user.coursesCount)}</TableCell>
                  <TableCell className="font-term text-[13px] text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
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

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <UsersTable />
    </Suspense>
  );
}
