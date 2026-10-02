import { BadgeCheck, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Container } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { formatDate, formatDuration } from "@/lib/format";
import { fetchOrNull, publicApi } from "@/lib/server-api";
import { CopyLinkButton } from "./copy-link-button";

const getCertificate = cache((code: string) =>
  fetchOrNull(publicApi.certificates[":code"].$get({ param: { code } })),
);

export async function generateMetadata({ params }: PageProps<"/certificados/[code]">): Promise<Metadata> {
  const { code } = await params;
  const cert = await getCertificate(code);
  if (!cert) return { title: "Certificado no encontrado" };
  return {
    title: `Certificado de ${cert.studentName}`,
    description: `${cert.studentName} completó el curso «${cert.course.title}».`,
  };
}

export default async function CertificatePage({ params }: PageProps<"/certificados/[code]">) {
  const { code } = await params;
  const cert = await getCertificate(code);
  if (!cert) notFound();

  return (
    <Container className="max-w-4xl space-y-6 py-10">
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm">
          <BadgeCheck className="size-5 text-emerald-600" />
          Certificado verificado: emitido por Academia el {formatDate(cert.issuedAt)}.
        </p>
        <div className="flex gap-2">
          <CopyLinkButton />
          <Button size="sm" asChild>
            <a href={`/api/certificates/${cert.code}/pdf`} target="_blank" rel="noreferrer">
              <Download /> Descargar PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Réplica visual del PDF */}
      <article className="relative overflow-hidden rounded-2xl border-[3px] border-primary bg-card p-8 shadow-xl sm:p-12">
        <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/5" />
        <div aria-hidden className="absolute -bottom-20 -left-20 size-56 rounded-full bg-primary/5" />
        <div className="relative space-y-6">
          <p className="font-heading text-sm font-bold tracking-[0.25em] text-primary">ACADEMIA</p>
          <div className="space-y-2">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Certificado de finalización</p>
            <p className="text-muted-foreground">Se otorga a</p>
            <p className="font-heading text-3xl font-bold sm:text-4xl">{cert.studentName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">por completar el curso</p>
            <Link href={`/cursos/${cert.course.slug}`} className="font-heading text-2xl font-bold text-primary hover:underline">
              {cert.course.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              Impartido por {cert.instructorName} · {formatDuration(cert.course.durationSec)} de contenido
            </p>
          </div>
          <div className="flex flex-wrap justify-between gap-6 border-t pt-6 text-sm">
            <div>
              <p className="font-semibold">{formatDate(cert.issuedAt)}</p>
              <p className="text-xs text-muted-foreground">Fecha de emisión</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold">{cert.code}</p>
              <p className="text-xs text-muted-foreground">Código de verificación</p>
            </div>
          </div>
        </div>
      </article>
    </Container>
  );
}
