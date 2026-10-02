"use client";

import { BookX, Lock, RefreshCw, SearchX } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center border-b px-4">
        <Logo />
      </header>
      <div className="flex flex-1 items-center justify-center p-6">{children}</div>
    </div>
  );
}

export function LearnErrorState({ error, slug, onRetry }: { error: unknown; slug: string; onRetry?: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;

  if (status === 403) {
    return (
      <Shell>
        <Empty className="max-w-md border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Lock />
            </EmptyMedia>
            <EmptyTitle>No estás inscrito en este curso</EmptyTitle>
            <EmptyDescription>Inscríbete para acceder a todas sus clases, recursos y a la comunidad.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <Button asChild>
              <Link href={`/cursos/${slug}`}>Ver el curso</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/mis-cursos">Mis cursos</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Shell>
    );
  }

  if (status === 404) {
    return (
      <Shell>
        <Empty className="max-w-md border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>Curso no encontrado</EmptyTitle>
            <EmptyDescription>Puede que el enlace sea incorrecto o que el curso ya no exista.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/mis-cursos">Ir a mis cursos</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Shell>
    );
  }

  return (
    <Shell>
      <Empty className="max-w-md border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookX />
          </EmptyMedia>
          <EmptyTitle>No se pudo cargar el curso</EmptyTitle>
          <EmptyDescription>{errorMessage(error)}</EmptyDescription>
        </EmptyHeader>
        {onRetry && (
          <EmptyContent>
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw /> Reintentar
            </Button>
          </EmptyContent>
        )}
      </Empty>
    </Shell>
  );
}

export function LearnEmptyCourse({ slug }: { slug: string }) {
  return (
    <Shell>
      <Empty className="max-w-md border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookX />
          </EmptyMedia>
          <EmptyTitle>Este curso todavía no tiene clases</EmptyTitle>
          <EmptyDescription>Vuelve pronto: el instructor está preparando el contenido.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button variant="outline" asChild>
            <Link href={`/cursos/${slug}`}>Ver el curso</Link>
          </Button>
          <Button asChild>
            <Link href="/mis-cursos">Mis cursos</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </Shell>
  );
}

export function LearnSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-14 items-center gap-4 border-b px-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-1">
        <div className="flex-1 space-y-4">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 px-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="hidden w-96 space-y-3 border-l p-4 lg:block">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
