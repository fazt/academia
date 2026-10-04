"use client";

import type { CommentKind } from "@academia/shared";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, MessageCircleQuestion, MessageSquare, MessagesSquare, Reply } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, TableCard } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { StatusPill } from "@/components/admin/badges";
import {
  CopyEmail,
  FilterSelect,
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
  TablePagination,
  TableToolbar,
  compact,
  useTableParams,
} from "@/components/admin/data-table";
import { useAdminOptions } from "@/components/admin/use-admin-options";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, call, errorMessage } from "@/lib/api";
import { formatRelative } from "@/lib/format";

const FILTERS = ["courseId", "kind", "status"] as const;
const COLUMNS = 6;

function CommentsTable() {
  const queryClient = useQueryClient();
  const table = useTableParams(FILTERS);
  const options = useAdminOptions();
  const [toggling, setToggling] = useState<string | null>(null);
  const query = {
    ...table.baseQuery,
    ...compact({ courseId: table.filters.courseId, kind: table.filters.kind, status: table.filters.status }),
  } as typeof table.baseQuery & {
    courseId?: string;
    kind?: CommentKind;
    status?: "unanswered" | "resolved" | "hidden";
  };

  const comments = useQuery({
    queryKey: ["admin", "comments", query],
    queryFn: () => call(api.admin.comments.$get({ query })),
    placeholderData: keepPreviousData,
  });

  const toggle = async (id: string, hidden: boolean) => {
    setToggling(id);
    try {
      await call(api.admin.comments[":id"].$patch({ param: { id }, json: { hidden } }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "comments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
      ]);
      toast.success(hidden ? "Mensaje oculto para los alumnos" : "Mensaje visible de nuevo");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Comentarios y preguntas"
        command="ls comentarios/"
        description="Mensajes de los alumnos en los capítulos. Responde desde la página de la clase."
      />
      <TableCard
        toolbar={
          <TableToolbar table={table} placeholder="Buscar en el texto o por alumno…">
            <FilterSelect
              label="Tipo"
              value={table.filters.kind}
              onChange={(kind) => table.setParams({ kind })}
              options={[
                { value: "question", label: "Preguntas" },
                { value: "comment", label: "Comentarios" },
              ]}
            />
            <FilterSelect
              label="Estado"
              className="sm:w-56"
              value={table.filters.status}
              onChange={(status) => table.setParams({ status })}
              options={[
                { value: "unanswered", label: "Sin responder" },
                { value: "resolved", label: "Resueltas" },
                { value: "hidden", label: "Ocultos" },
              ]}
            />
            <FilterSelect
              label="Curso"
              value={table.filters.courseId}
              onChange={(courseId) => table.setParams({ courseId })}
              options={(options.data?.courses ?? []).map((c) => ({ value: c.id, label: c.title }))}
              className="sm:w-56"
            />
          </TableToolbar>
        }
        footer={comments.data && <TablePagination table={table} total={comments.data.total} pageCount={comments.data.pageCount} />}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="min-w-80">Mensaje</TableHead>
              <TableHead className="min-w-48">Alumno</TableHead>
              <TableHead className="min-w-48">Curso · capítulo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-28 text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.isLoading ? (
              <TableLoadingRows columns={COLUMNS} />
            ) : comments.error ? (
              <TableErrorRow columns={COLUMNS} message={errorMessage(comments.error)} onRetry={() => comments.refetch()} />
            ) : !comments.data?.items.length ? (
              <TableEmptyRow
                columns={COLUMNS}
                icon={<MessagesSquare />}
                title={table.filters.status === "unanswered" ? "No hay preguntas pendientes" : "No hay mensajes"}
                description={table.filters.status === "unanswered" ? "¡Todo respondido!" : "Prueba con otros filtros."}
              />
            ) : (
              comments.data.items.map((comment) => {
                const tab = comment.kind === "question" ? "preguntas" : "comentarios";
                const replyHref = `/aprender/${comment.course.slug}/${comment.chapter.id}?tab=${tab}#c-${comment.id}`;
                return (
                  <TableRow key={comment.id} className={comment.hidden ? "opacity-60" : undefined}>
                    <TableCell>
                      {comment.kind === "question" ? (
                        <StatusPill tone="info" dot={false}>
                          <MessageCircleQuestion className="size-3" /> Pregunta
                        </StatusPill>
                      ) : (
                        <StatusPill dot={false}>
                          <MessageSquare className="size-3" /> Comentario
                        </StatusPill>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      <p className="line-clamp-3 text-sm">{comment.body}</p>
                      <p className="mt-1 font-term text-xs text-muted-foreground">
                        {formatRelative(comment.createdAt)} · {comment.repliesCount}{" "}
                        {comment.repliesCount === 1 ? "respuesta" : "respuestas"}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <Link href={`/admin/usuarios/${comment.user.id}`} className="block truncate font-medium hover:text-primary">
                        {comment.user.name}
                      </Link>
                      <CopyEmail email={comment.user.email} className="text-xs text-muted-foreground" />
                    </TableCell>
                    <TableCell className="max-w-56 whitespace-normal">
                      <p className="line-clamp-1 text-sm">{comment.course.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{comment.chapter.title}</p>
                    </TableCell>
                    <TableCell>
                      {comment.hidden ? (
                        <StatusPill>Oculto</StatusPill>
                      ) : comment.kind === "question" ? (
                        comment.isResolved ? (
                          <StatusPill tone="success">Resuelta</StatusPill>
                        ) : (
                          <StatusPill tone="warning">Abierta</StatusPill>
                        )
                      ) : (
                        <StatusPill tone="success">Visible</StatusPill>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" asChild>
                              <Link href={replyHref} aria-label="Responder en la clase">
                                <Reply />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Responder en la clase</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={toggling === comment.id}
                              onClick={() => toggle(comment.id, !comment.hidden)}
                              aria-label={comment.hidden ? "Mostrar" : "Ocultar"}
                            >
                              {toggling === comment.id ? <Spinner /> : comment.hidden ? <Eye /> : <EyeOff />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{comment.hidden ? "Mostrar" : "Ocultar a los alumnos"}</TooltipContent>
                        </Tooltip>
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

export default function AdminCommentsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <CommentsTable />
    </Suspense>
  );
}
