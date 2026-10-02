"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { toast } from "sonner";
import { AdminPageHeader, TableCard } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { ConfirmAction } from "@/components/admin/confirm-button";
import {
  SortableHead,
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
  TablePagination,
  TableToolbar,
  useTableParams,
} from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

const COLUMNS = 5;

function CategoriesTable() {
  const queryClient = useQueryClient();
  const table = useTableParams();
  const query = table.baseQuery;
  const categories = useQuery({
    queryKey: ["admin", "categories", query],
    queryFn: () => call(api.admin.categories.$get({ query })),
    placeholderData: keepPreviousData,
  });

  const remove = async (id: string) => {
    try {
      await call(api.admin.categories[":id"].$delete({ param: { id } }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "categories"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "options"] }),
      ]);
      toast.success("Categoría eliminada");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categorías"
        description="Agrupan los cursos en el catálogo."
        actions={
          <Button asChild>
            <Link href="/admin/categorias/nuevo">
              <Plus /> Nueva categoría
            </Link>
          </Button>
        }
      />
      <TableCard
        toolbar={<TableToolbar table={table} placeholder="Buscar por nombre o slug…" />}
        footer={
          categories.data && (
            <TablePagination table={table} total={categories.data.total} pageCount={categories.data.pageCount} />
          )
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead table={table} column="name">
                Nombre
              </SortableHead>
              <SortableHead table={table} column="slug">
                Slug
              </SortableHead>
              <TableHead className="text-right">Cursos</TableHead>
              <SortableHead table={table} column="createdAt">
                Creada
              </SortableHead>
              <TableHead className="w-24">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : categories.error ? (
              <TableErrorRow columns={COLUMNS} message={errorMessage(categories.error)} onRetry={() => categories.refetch()} />
            ) : !categories.data?.items.length ? (
              <TableEmptyRow
                columns={COLUMNS}
                icon={<FolderTree />}
                title="No hay categorías"
                description={table.q ? "Prueba con otra búsqueda." : "Crea categorías para organizar el catálogo."}
              />
            ) : (
              categories.data.items.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/categorias/${category.id}`} className="hover:text-primary">
                      {category.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{category.slug}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(category.coursesCount)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(category.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/admin/categorias/${category.id}`} aria-label={`Editar ${category.name}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <ConfirmAction
                        destructive
                        title="¿Borrar esta categoría?"
                        description={
                          category.coursesCount
                            ? `Sus ${category.coursesCount} cursos quedarán sin categoría.`
                            : "No tiene cursos asociados."
                        }
                        confirmLabel="Borrar"
                        onConfirm={() => remove(category.id)}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Borrar ${category.name}`}>
                            <Trash2 />
                          </Button>
                        }
                      />
                    </div>
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

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <CategoriesTable />
    </Suspense>
  );
}
