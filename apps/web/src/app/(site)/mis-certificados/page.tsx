"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, GraduationCap } from "lucide-react";
import Link from "next/link";
import { CourseGrid } from "@/components/course/course-card";
import { Container, PageHeader } from "@/components/layout/page-header";
import { TermPanel } from "@/components/layout/term";
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
    <Container className="flex flex-col gap-10 py-12">
      <PageHeader
        command="ls certificados/"
        title="Mis certificados"
        description="Completa todas las clases de un curso para obtener su certificado."
      />
      {isLoading ? (
        <CourseGrid>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-[14px]" />
          ))}
        </CourseGrid>
      ) : error ? (
        <Empty className="rounded-[14px] border border-term-border">
          <EmptyHeader>
            <EmptyTitle>No se pudieron cargar tus certificados</EmptyTitle>
            <EmptyDescription>{errorMessage(error)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : certificates.length === 0 ? (
        <Empty className="rounded-[14px] border border-dashed border-term-border-strong p-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes certificados</EmptyTitle>
            <EmptyDescription>Termina un curso y tu certificado aparecerá aquí al instante.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/mis-cursos">ir a mis cursos →</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <CourseGrid>
          {certificates.map((cert) => (
            <TermPanel
              key={cert.code}
              title={`certificados/${cert.code}`}
              aside={<span className="shrink-0 text-term-ok">✓ verificable</span>}
              className="flex flex-col"
            >
              {cert.course.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- portadas en Spaces/CDN con dominio configurable
                <img
                  src={cert.course.coverImageUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-full border-b border-term-border object-cover"
                />
              )}
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h2 className="text-[21px] leading-snug font-semibold">{cert.course.title}</h2>
                <p className="font-term text-[13px] text-term-muted">
                  emitido el {formatDate(cert.issuedAt)} · <span className="text-term-text">{cert.code}</span>
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/certificados/${cert.code}`}>ver certificado →</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <a href={`/api/certificates/${cert.code}/pdf`} target="_blank" rel="noopener">
                      <Download /> descargar pdf
                    </a>
                  </Button>
                </div>
              </div>
            </TermPanel>
          ))}
        </CourseGrid>
      )}
    </Container>
  );
}
