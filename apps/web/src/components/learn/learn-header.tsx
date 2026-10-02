"use client";

import { Award, ChevronLeft, ListVideo, Star } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
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
      <circle cx="18" cy="18" r={radius} fill="none" className="stroke-muted" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        className="stroke-primary transition-[stroke-dashoffset] duration-500"
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
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur sm:gap-3 sm:px-4">
      <Button variant="ghost" size="sm" asChild className="shrink-0">
        <Link href="/mis-cursos" aria-label="Volver a mis cursos">
          <ChevronLeft />
          <span className="hidden md:inline">Mis cursos</span>
        </Link>
      </Button>
      <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href={`/cursos/${course.slug}`}
          className="truncate font-heading text-sm font-semibold hover:text-primary sm:text-base"
        >
          {course.title}
        </Link>
        {data.isAdmin && (
          <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
            Vista de administrador
          </Badge>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="relative flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Progreso del curso: ${summary.percent} %`}
            >
              <span className="relative grid place-items-center">
                <ProgressRing percent={summary.percent} />
                <span className="absolute text-[10px] font-semibold">{summary.percent}</span>
              </span>
              <span className="hidden font-medium lg:inline">Tu progreso</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <p className="font-heading font-semibold">
              {summary.done} de {summary.total} clases completadas
            </p>
            <Progress value={summary.percent} />
            <p className="text-sm text-muted-foreground">
              {data.certificateCode
                ? "¡Completaste el curso! Tu certificado está listo."
                : "Completa todas las clases para obtener tu certificado."}
            </p>
            {data.certificateCode && (
              <Button asChild size="sm" className="w-full">
                <Link href={`/certificados/${data.certificateCode}`}>
                  <Award /> Ver certificado
                </Link>
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {data.certificateCode && (
          <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
            <Link href={`/certificados/${data.certificateCode}`}>
              <Award /> Certificado
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
                <span className="hidden md:inline">{data.myReview ? "Editar reseña" : "Dejar reseña"}</span>
              </Button>
            }
          />
        )}

        <Button variant="outline" size="sm" className="lg:hidden" onClick={onOpenCurriculum} aria-label="Ver contenido del curso">
          <ListVideo />
          <span className="hidden sm:inline">Contenido</span>
        </Button>

        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
