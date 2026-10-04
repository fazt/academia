"use client";

import { COURSE_STATUS_LABELS, type CourseStatus } from "@academia/shared";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, Check, CircleAlert, EyeOff, Rocket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CourseStatusBadge } from "@/components/admin/badges";
import { ConfirmAction } from "@/components/admin/confirm-button";
import type { AdminCourse } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

function CheckItem({ ok, children, required }: { ok: boolean; children: React.ReactNode; required?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
          ok ? "bg-term-ok text-term-bg" : required ? "bg-destructive/10 text-destructive" : "bg-term-raised text-term-muted",
        )}
      >
        {ok ? <Check className="size-3" strokeWidth={3} /> : <CircleAlert className="size-3.5" />}
      </span>
      <span className={cn(!ok && "text-muted-foreground")}>
        {children}
        {required && !ok && <span className="ml-1 font-term text-xs font-medium text-destructive">(obligatorio)</span>}
      </span>
    </li>
  );
}

export function CoursePublish({ course }: { course: AdminCourse }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<CourseStatus | null>(null);

  const chapters = course.sections.flatMap((s) => s.chapters);
  const readyChapters = chapters.filter((c) => c.videoStatus === "ready");
  const pendingVideos = chapters.length - readyChapters.length;

  const setStatus = async (status: CourseStatus) => {
    setPending(status);
    try {
      await call(api.admin.courses[":id"].status.$patch({ param: { id: course.id }, json: { status } }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "course", course.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "courses"] }),
      ]);
      toast.success(`Curso: ${COURSE_STATUS_LABELS[status].toLowerCase()}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const remove = async () => {
    try {
      await call(api.admin.courses[":id"].$delete({ param: { id: course.id } }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      toast.success("Curso eliminado");
      router.push("/admin/cursos");
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Estado del curso <CourseStatusBadge status={course.status} />
          </CardTitle>
          <CardDescription>
            {course.status === "published"
              ? `Publicado desde el ${formatDate(course.publishedAt)}. Aparece en el catálogo y se puede comprar.`
              : course.status === "archived"
                ? "Archivado: no aparece en el catálogo ni se puede comprar, pero los alumnos inscritos conservan el acceso."
                : "Borrador: solo lo ven los administradores. Publícalo cuando esté listo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            <CheckItem ok={readyChapters.length > 0} required>
              Al menos un capítulo con video listo ({readyChapters.length} de {chapters.length})
            </CheckItem>
            <CheckItem ok={pendingVideos === 0}>
              {pendingVideos === 0
                ? "Todos los capítulos tienen video"
                : `${pendingVideos} ${pendingVideos === 1 ? "capítulo sin video listo (no se mostrará como reproducible)" : "capítulos sin video listo (no se mostrarán como reproducibles)"}`}
            </CheckItem>
            <CheckItem ok={!!course.coverImageUrl}>Portada del curso</CheckItem>
            <CheckItem ok={course.description.trim().length >= 80}>Descripción completa (80 caracteres o más)</CheckItem>
            <CheckItem ok={course.learningOutcomes.length > 0}>Lista de lo que aprenderán</CheckItem>
            <CheckItem ok={chapters.some((c) => c.isFreePreview && c.videoStatus === "ready")}>
              Algún capítulo de vista previa gratuita
            </CheckItem>
          </ul>
          <p className="mt-4 font-term text-[13px] text-muted-foreground">
            Duración publicada: {formatDuration(course.durationSec)} · {course.chaptersCount} capítulos
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t">
          {course.status !== "published" && (
            <Button onClick={() => setStatus("published")} disabled={pending !== null}>
              {pending === "published" ? <Spinner /> : <Rocket />} publicar
            </Button>
          )}
          {course.status !== "draft" && (
            <Button variant="outline" onClick={() => setStatus("draft")} disabled={pending !== null}>
              {pending === "draft" ? <Spinner /> : <EyeOff />} pasar a borrador
            </Button>
          )}
          {course.status !== "archived" && (
            <Button variant="outline" onClick={() => setStatus("archived")} disabled={pending !== null}>
              {pending === "archived" ? <Spinner /> : <Archive />} archivar
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Zona peligrosa</CardTitle>
          <CardDescription>
            Borrar el curso elimina su currículo, videos y recursos. Si ya tiene ventas o alumnos no se puede borrar:
            archívalo en su lugar.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <ConfirmAction
            destructive
            title="¿Borrar este curso?"
            description={`Se eliminarán «${course.title}», sus capítulos, videos y recursos. Esta acción no se puede deshacer.`}
            confirmLabel="borrar curso"
            onConfirm={remove}
            trigger={
              <Button variant="destructive">
                <Trash2 /> borrar curso
              </Button>
            }
          />
        </CardFooter>
      </Card>
    </div>
  );
}
