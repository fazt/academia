"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Star } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { toast } from "sonner";
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
import { useAdminOptions } from "@/components/admin/use-admin-options";
import { RatingStars } from "@/components/course/rating-stars";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

const FILTERS = ["courseId", "rating", "hidden"] as const;
const COLUMNS = 6;

function ReviewsTable() {
  const queryClient = useQueryClient();
  const table = useTableParams(FILTERS);
  const options = useAdminOptions();
  const [toggling, setToggling] = useState<string | null>(null);
  const query = {
    ...table.baseQuery,
    ...compact({ courseId: table.filters.courseId, rating: table.filters.rating, hidden: table.filters.hidden }),
  } as typeof table.baseQuery & { courseId?: string; rating?: string; hidden?: "true" | "false" };

  const reviews = useQuery({
    queryKey: ["admin", "reviews", query],
    queryFn: () => call(api.admin.reviews.$get({ query })),
    placeholderData: keepPreviousData,
  });

  const toggle = async (id: string, hidden: boolean) => {
    setToggling(id);
    try {
      await call(api.admin.reviews[":id"].$patch({ param: { id }, json: { hidden } }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      toast.success(hidden ? "Reseña oculta: ya no cuenta en la valoración" : "Reseña visible de nuevo");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reseñas"
        description="Valoraciones de los alumnos. Ocultar una reseña la retira de la página del curso y de la media."
      />
      <TableCard
        toolbar={
          <TableToolbar table={table} placeholder="Buscar en el texto o por alumno…">
            <FilterSelect
              label="Curso"
              value={table.filters.courseId}
              onChange={(courseId) => table.setParams({ courseId })}
              options={(options.data?.courses ?? []).map((c) => ({ value: c.id, label: c.title }))}
              className="sm:w-56"
            />
            <FilterSelect
              label="Puntuación"
              value={table.filters.rating}
              onChange={(rating) => table.setParams({ rating })}
              allLabel="Todas"
              options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "estrella" : "estrellas"}` }))}
            />
            <FilterSelect
              label="Estado"
              value={table.filters.hidden}
              onChange={(hidden) => table.setParams({ hidden })}
              options={[
                { value: "false", label: "Visibles" },
                { value: "true", label: "Ocultas" },
              ]}
            />
          </TableToolbar>
        }
        footer={reviews.data && <TablePagination table={table} total={reviews.data.total} pageCount={reviews.data.pageCount} />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-48">Alumno</TableHead>
              <TableHead>Curso</TableHead>
              <SortableHead table={table} column="rating">
                Puntuación
              </SortableHead>
              <TableHead className="min-w-72">Comentario</TableHead>
              <SortableHead table={table} column="createdAt">
                Fecha
              </SortableHead>
              <TableHead className="w-32 text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : reviews.error ? (
              <TableErrorRow columns={COLUMNS} message={errorMessage(reviews.error)} onRetry={() => reviews.refetch()} />
            ) : !reviews.data?.items.length ? (
              <TableEmptyRow columns={COLUMNS} icon={<Star />} title="No hay reseñas" description="Prueba con otros filtros." />
            ) : (
              reviews.data.items.map((review) => (
                <TableRow key={review.id} className={review.hidden ? "opacity-60" : undefined}>
                  <TableCell className="max-w-56">
                    <Link href={`/admin/usuarios/${review.user.id}`} className="block truncate font-medium hover:text-primary">
                      {review.user.name}
                    </Link>
                    <CopyEmail email={review.user.email} className="text-xs text-muted-foreground" />
                  </TableCell>
                  <TableCell className="max-w-48">
                    <Link href={`/cursos/${review.course.slug}`} target="_blank" className="line-clamp-2 hover:text-primary">
                      {review.course.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RatingStars value={review.rating} />
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal">
                    {review.body ? (
                      <p className="line-clamp-3 text-sm">{review.body}</p>
                    ) : (
                      <span className="text-muted-foreground">Sin comentario</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(review.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {review.hidden ? <StatusPill>Oculta</StatusPill> : <StatusPill tone="success">Visible</StatusPill>}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={toggling === review.id}
                        onClick={() => toggle(review.id, !review.hidden)}
                        aria-label={review.hidden ? "Mostrar reseña" : "Ocultar reseña"}
                      >
                        {toggling === review.id ? <Spinner /> : review.hidden ? <Eye /> : <EyeOff />}
                      </Button>
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

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <ReviewsTable />
    </Suspense>
  );
}
