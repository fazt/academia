import { BadgeCheck, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Container } from "@/components/layout/page-header";
import { TermPanel } from "@/components/layout/term";
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
      <div className="flex flex-col gap-3 rounded-[14px] border border-term-ok/40 bg-term-ok/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm">
          <BadgeCheck className="size-5 shrink-0 text-term-ok" />
          Certificado verificado: emitido por Academia el {formatDate(cert.issuedAt)}.
        </p>
        <div className="flex gap-2">
          <CopyLinkButton />
          <Button size="sm" asChild>
            <a href={`/api/certificates/${cert.code}/pdf`} target="_blank" rel="noreferrer">
              <Download /> descargar PDF
            </a>
          </Button>
        </div>
      </div>

      <TermPanel
        title={`certificados/${cert.code}`}
        aside={<span className="shrink-0 text-term-ok">verificado ✓</span>}
        className="border-term-accent shadow-[0_40px_80px_-40px_rgba(0,0,0,0.25)] dark:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]"
      >
        <article className="flex flex-col gap-8 p-8 sm:p-12">
          <p className="flex items-center font-term text-lg font-extrabold">
            academia
            <span aria-hidden className="ml-1 inline-block h-5 w-2.5 bg-term-accent" />
          </p>
          <div className="space-y-2">
            <p className="font-term text-[13px] text-term-muted">
              <span className="text-term-accent">$</span> certificado de finalización
            </p>
            <p className="text-term-muted">Se otorga a</p>
            <p className="font-term text-[clamp(2rem,4.4vw,3rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
              {cert.studentName}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-term-muted">por completar el curso</p>
            <Link
              href={`/cursos/${cert.course.slug}`}
              className="text-2xl leading-snug font-semibold text-term-accent underline-offset-4 hover:underline"
            >
              {cert.course.title}
            </Link>
            <p className="font-term text-[13px] text-term-muted">
              impartido por {cert.instructorName} · {formatDuration(cert.course.durationSec)} de contenido
            </p>
          </div>
          <div className="flex flex-wrap justify-between gap-6 border-t border-term-border pt-6 font-term text-[13px]">
            <div>
              <p className="font-bold">{formatDate(cert.issuedAt)}</p>
              <p className="text-term-muted">fecha de emisión</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-term-num">{cert.code}</p>
              <p className="text-term-muted">código de verificación</p>
            </div>
          </div>
        </article>
      </TermPanel>
    </Container>
  );
}
