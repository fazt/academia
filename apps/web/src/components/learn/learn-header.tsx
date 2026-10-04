"use client";

import { Award, ChevronLeft, ListVideo, Star } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ReviewDialog } from "./review-dialog";
import type { LearnData } from "./types";

function ProgressRing({ percent }: { percent: number }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 36 36" className="size-9 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={radius} fill="none" className="stroke-term-border" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        className="stroke-term-accent transition-[stroke-dashoffset] duration-500"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent / 100)}
      />
    </svg>
  );
}

export function LearnHeader({ data, onOpenCurriculum }: { data: LearnData; onOpenCurriculum: () => void }) {
  const { course, summary } = data;
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-term-border bg-term-bg/85 px-2 font-term backdrop-blur supports-[backdrop-filter]:bg-term-bg/70 sm:gap-3 sm:px-5">
      <Logo className="hidden sm:flex" />
      <Link
        href="/mis-cursos"
        aria-label="Volver a mis cursos"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-term-muted transition-colors hover:bg-term-surface hover:text-term-text focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none sm:hidden"
      >
        <ChevronLeft className="size-[18px]" />
      </Link>
      <span aria-hidden className="hidden h-5 w-px shrink-0 bg-term-border sm:block" />

      {/* Ruta del curso: mis-cursos/<slug>/ */}
      <nav aria-label="Ruta" className="flex min-w-0 flex-1 items-center gap-1 text-sm text-term-muted">
        <Link href="/mis-cursos" className="hidden shrink-0 transition-colors hover:text-term-text sm:inline">
          mis-cursos<span className="text-term-accent">/</span>
        </Link>
        <Link
          href={`/cursos/${course.slug}`}
          title={course.title}
          className="min-w-0 truncate text-term-text transition-colors hover:text-term-accent"
        >
          <span className="sr-only">{course.title}: </span>
          {course.slug}
          <span className="text-term-accent">/</span>
        </Link>
        {data.isAdmin && (
          <span className="ml-2 hidden shrink-0 rounded-full border border-term-border-strong px-2 py-0.5 text-[11px] text-term-muted sm:inline">
            vista de administrador
          </span>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="relative flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-term-surface focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none"
              aria-label={`Progreso del curso: ${summary.percent} %`}
            >
              <span className="relative grid place-items-center">
                <ProgressRing percent={summary.percent} />
                <span className="absolute text-[10px] font-bold">{summary.percent}</span>
              </span>
              <span className="hidden text-[13px] text-term-muted lg:inline">
                {summary.done}/{summary.total} · {summary.percent} %
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <p className="font-term font-bold">
              {summary.done} de {summary.total} clases completadas
            </p>
            <Progress value={summary.percent} className="bg-term-border" />
            <p className="text-sm text-term-muted">
              {data.certificateCode
                ? "¡Completaste el curso! Tu certificado está listo."
                : "Completa todas las clases para obtener tu certificado."}
            </p>
            {data.certificateCode && (
              <Button asChild size="sm" className="w-full">
                <Link href={`/certificados/${data.certificateCode}`}>
                  <Award /> ver certificado
                </Link>
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {data.certificateCode && (
          <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
            <Link href={`/certificados/${data.certificateCode}`}>
              <Award /> certificado
            </Link>
          </Button>
        )}

        {data.enrolled && (
          <ReviewDialog
            slug={course.slug}
            courseId={course.id}
            initial={data.myReview ? { rating: data.myReview.rating, body: data.myReview.body } : null}
            trigger={
              <Button variant="outline" size="sm" aria-label={data.myReview ? "Editar reseña" : "Dejar reseña"}>
                <Star />
                <span className="hidden md:inline">{data.myReview ? "editar reseña" : "dejar reseña"}</span>
              </Button>
            }
          />
        )}

        <Button variant="outline" size="sm" className="lg:hidden" onClick={onOpenCurriculum} aria-label="Ver contenido del curso">
          <ListVideo />
          <span className="hidden sm:inline">contenido</span>
        </Button>

        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
