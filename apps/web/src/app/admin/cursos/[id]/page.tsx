"use client";

import { useQuery } from "@tanstack/react-query";
import { BookX, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { AdminPageSkeleton } from "@/components/admin/admin-shell";
import { CourseStatusBadge } from "@/components/admin/badges";
import { CourseForm } from "@/components/admin/course-form";
import { CoursePublish } from "@/components/admin/course-publish";
import { CurriculumBuilder } from "@/components/admin/curriculum-builder";
import { VideoUploadsProvider } from "@/components/admin/video-uploads";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, api, call, errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format";

const TABS = ["informacion", "curriculo", "publicacion"] as const;
type Tab = (typeof TABS)[number];

// Pestañas como la navegación de la portada: monoespaciada y subrayado del acento en la activa.
const tabClass = "px-3 after:bg-term-accent data-active:text-term-accent dark:data-active:text-term-accent";

function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "informacion";

  const course = useQuery({
    queryKey: ["admin", "course", id],
    queryFn: () => call(api.admin.courses[":id"].$get({ param: { id } })),
  });

  if (course.isLoading) return <AdminPageSkeleton />;

  if (course.error || !course.data) {
    const notFound = course.error instanceof ApiError && course.error.status === 404;
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookX />
          </EmptyMedia>
          <EmptyTitle>{notFound ? "Curso no encontrado" : "No se pudo cargar el curso"}</EmptyTitle>
          <EmptyDescription>{notFound ? "Puede que se haya borrado." : errorMessage(course.error)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/admin/cursos">volver a cursos</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const data = course.data;
  const chapterCount = data.sections.reduce((sum, s) => sum + s.chapters.length, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        backHref="/admin/cursos"
        backLabel="Cursos"
        command={`vim cursos/${data.slug}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 break-words">{data.title}</span>
            <CourseStatusBadge status={data.status} />
          </span>
        }
        description={`${data.sections.length} secciones · ${chapterCount} capítulos · ${formatDuration(data.durationSec)} de video listo`}
        actions={
          data.status === "published" && (
            <Button variant="outline" asChild>
              <Link href={`/cursos/${data.slug}`} target="_blank">
                <ExternalLink /> ver en la web
              </Link>
            </Button>
          )
        }
      />

      {/* Por encima de las pestañas: una subida sigue viva al cambiar de pestaña. */}
      <VideoUploadsProvider courseId={data.id} chapters={data.sections.flatMap((s) => s.chapters)}>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("tab", value);
            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
          }}
        >
          <TabsList variant="line" className="font-term">
            <TabsTrigger value="informacion" className={tabClass}>
              información
            </TabsTrigger>
            <TabsTrigger value="curriculo" className={tabClass}>
              currículo
            </TabsTrigger>
            <TabsTrigger value="publicacion" className={tabClass}>
              publicación
            </TabsTrigger>
          </TabsList>
          <TabsContent value="informacion" className="mt-4">
            <CourseForm
              courseId={data.id}
              initial={{
                title: data.title,
                slug: data.slug,
                subtitle: data.subtitle,
                description: data.description,
                learningOutcomes: data.learningOutcomes,
                requirements: data.requirements,
                level: data.level,
                language: data.language,
                categoryId: data.categoryId,
                instructorId: data.instructorId,
                coverImageUrl: data.coverImageUrl,
                priceCents: data.priceCents,
              }}
            />
          </TabsContent>
          <TabsContent value="curriculo" className="mt-4">
            <CurriculumBuilder course={data} />
          </TabsContent>
          <TabsContent value="publicacion" className="mt-4">
            <CoursePublish course={data} />
          </TabsContent>
        </Tabs>
      </VideoUploadsProvider>
    </div>
  );
}

export default function CourseEditorPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <CourseEditor />
    </Suspense>
  );
}
