"use client";

import { COURSE_STATUS_LABELS, COURSE_STATUSES, type CourseStatus } from "@academia/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BookOpen, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader, TableCard } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { CourseStatusBadge } from "@/components/admin/badges";
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
import { useAdminOptions } from "@/components/admin/use-admin-options";
import { CourseCover } from "@/components/course/course-cover";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";

const FILTERS = ["status", "categoryId"] as const;
const COLUMNS = 7;

function CoursesTable() {
  const router = useRouter();
  const table = useTableParams(FILTERS);
  const options = useAdminOptions();
  const query = {
    ...table.baseQuery,
    ...compact({ status: table.filters.status, categoryId: table.filters.categoryId }),
  } as typeof table.baseQuery & { status?: CourseStatus; categoryId?: string };

  const courses = useQuery({
    queryKey: ["admin", "courses", query],
    queryFn: () => call(api.admin.courses.$get({ query })),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cursos"
        description="Crea cursos, organiza su currículo y publícalos."
        actions={
          <Button asChild>
            <Link href="/admin/cursos/nuevo">
              <Plus /> Nuevo curso
            </Link>
          </Button>
        }
      />
      <TableCard
        toolbar={
          <TableToolbar table={table} placeholder="Buscar por título o slug…">
            <FilterSelect
              label="Estado"
              value={table.filters.status}
              onChange={(status) => table.setParams({ status })}
              options={COURSE_STATUSES.map((s) => ({ value: s, label: COURSE_STATUS_LABELS[s] }))}
            />
            <FilterSelect
              label="Categoría"
              value={table.filters.categoryId}
              onChange={(categoryId) => table.setParams({ categoryId })}
              allLabel="Todas"
              options={(options.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
              className="sm:w-52"
            />
          </TableToolbar>
        }
        footer={
          courses.data && (
            <TablePagination table={table} total={courses.data.total} pageCount={courses.data.pageCount} />
          )
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead table={table} column="title" className="min-w-72">
                Curso
              </SortableHead>
              <TableHead>Categoría</TableHead>
              <SortableHead table={table} column="status">
                Estado
              </SortableHead>
              <SortableHead table={table} column="priceCents" className="text-right">
                Precio
              </SortableHead>
              <SortableHead table={table} column="studentsCount" className="text-right">
                Alumnos
              </SortableHead>
              <SortableHead table={table} column="updatedAt">
                Actualizado
              </SortableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : courses.error ? (
              <TableErrorRow columns={COLUMNS} message={errorMessage(courses.error)} onRetry={() => courses.refetch()} />
            ) : !courses.data?.items.length ? (
              <TableEmptyRow
                columns={COLUMNS}
                icon={<BookOpen />}
                title="No hay cursos"
                description={table.q || table.filters.status || table.filters.categoryId ? "Prueba con otros filtros." : "Crea tu primer curso para empezar."}
              />
            ) : (
              courses.data.items.map((course) => (
                <TableRow
                  key={course.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/cursos/${course.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-20 shrink-0 overflow-hidden rounded-md border">
                        <CourseCover title={course.title} src={course.coverImageUrl} className="[&>span]:hidden" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/cursos/${course.id}`}
                          className="line-clamp-1 font-medium hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {course.title}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {course.instructor.name} · {course.chaptersCount} capítulos
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{course.category?.name ?? "—"}</TableCell>
                  <TableCell>
                    <CourseStatusBadge status={course.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(course.priceCents, course.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(course.studentsCount)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(course.updatedAt)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/admin/cursos/${course.id}`} aria-label={`Editar ${course.title}`}>
                        <Pencil />
                      </Link>
                    </Button>
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

export default function AdminCoursesPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <CoursesTable />
    </Suspense>
  );
}
