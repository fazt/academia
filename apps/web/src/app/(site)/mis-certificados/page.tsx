"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, Download, ExternalLink, GraduationCap } from "lucide-react";
import Link from "next/link";
import { CourseCover } from "@/components/course/course-cover";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api, call, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function MyCertificatesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-certificates"],
    queryFn: () => call(api.me.certificates.$get()),
  });
  const certificates = data?.items ?? [];

  return (
    <Container className="space-y-8 py-10">
      <PageHeader
        title="Mis certificados"
        description="Completa todas las clases de un curso para obtener su certificado."
      />
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No se pudieron cargar tus certificados</EmptyTitle>
            <EmptyDescription>{errorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : certificates.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes certificados</EmptyTitle>
            <EmptyDescription>Termina un curso y tu certificado aparecerá aquí al instante.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/mis-cursos">Ir a mis cursos</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <article key={cert.code} className="flex flex-col overflow-hidden rounded-xl border bg-card">
              <div className="relative">
                <CourseCover title={cert.course.title} src={cert.course.coverImageUrl} />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                  <Award className="size-3.5 text-primary" /> Certificado
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="space-y-1">
                  <h2 className="line-clamp-2 font-heading leading-snug font-semibold">{cert.course.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Emitido el {formatDate(cert.issuedAt)} · <span className="font-mono">{cert.code}</span>
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/certificados/${cert.code}`}>
                      <ExternalLink /> Ver
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <a href={`/api/certificates/${cert.code}/pdf`} target="_blank" rel="noopener">
                      <Download /> Descargar PDF
                    </a>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Container>
  );
}
