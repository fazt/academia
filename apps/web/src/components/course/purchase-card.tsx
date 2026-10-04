"use client";

import { Award, Clock, Download, Infinity as InfinityIcon, MessagesSquare, PlayCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { CourseCover } from "@/components/course/course-cover";
import { TermPanel } from "@/components/layout/term";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useCheckout } from "@/hooks/use-checkout";
import { useLibrary } from "@/hooks/use-library";
import { formatDuration, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PurchaseCardProps {
  course: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl: string | null;
    priceCents: number;
    currency: string;
    durationSec: number;
    chaptersCount: number;
  };
  resourcesCount: number;
  onPreview?: () => void;
  hasPreview: boolean;
}

export function PurchaseCard({ course, resourcesCount, onPreview, hasPreview }: PurchaseCardProps) {
  const { enrolled, isLoading } = useLibrary();
  const cart = useCart();
  const { checkout, pending } = useCheckout();
  const owned = enrolled.has(course.id);
  const inCart = cart.has(course.id);
  const free = course.priceCents === 0;

  let actions: React.ReactNode;
  if (isLoading) {
    actions = <Skeleton className="h-11 w-full" />;
  } else if (owned) {
    actions = (
      <Button size="lg" className="h-11 w-full" asChild>
        <Link href={`/aprender/${course.slug}`}>
          <PlayCircle /> ir al curso
        </Link>
      </Button>
    );
  } else if (free) {
    actions = (
      <Button size="lg" className="h-11 w-full" disabled={pending} onClick={() => checkout({ courseId: course.id })}>
        {pending && <Spinner />} inscribirme gratis
      </Button>
    );
  } else {
    actions = (
      <div className="space-y-2">
        {inCart ? (
          <Button size="lg" className="h-11 w-full" asChild>
            <Link href="/carrito">
              <ShoppingCart /> ir al carrito
            </Link>
          </Button>
        ) : (
          <Button size="lg" className="h-11 w-full" onClick={() => cart.add(course.id)}>
            <ShoppingCart /> añadir al carrito
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className="h-11 w-full"
          disabled={pending}
          onClick={() => checkout({ courseId: course.id })}
        >
          {pending && <Spinner />} comprar ahora
        </Button>
      </div>
    );
  }

  return (
    <TermPanel
      title={
        <>
          {course.slug}
          <span className="text-term-accent">/</span>
        </>
      }
      aside={hasPreview ? <span className="shrink-0">vista previa gratis</span> : undefined}
      className="shadow-[0_40px_80px_-40px_rgba(0,0,0,0.25)] dark:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]"
    >
      <button
        type="button"
        onClick={onPreview}
        disabled={!hasPreview}
        className="group relative block w-full border-b border-term-border focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none focus-visible:ring-inset disabled:cursor-default"
        aria-label="Ver vista previa del curso"
      >
        <CourseCover title={course.title} src={course.coverImageUrl} className={cn(hasPreview && "[&>span]:hidden")} />
        {hasPreview && (
          // Velo sobre la portada: oscuro en los dos temas, como la pantalla del reproductor.
          <span className="dark absolute inset-0 grid place-items-center bg-black/35 transition-colors group-hover:bg-black/50">
            <span className="flex flex-col items-center gap-2 font-term text-[13px] font-bold text-term-text">
              <span className="grid size-[60px] place-items-center rounded-full bg-term-text/10">
                <PlayCircle className="size-8" strokeWidth={1.5} />
              </span>
              ver vista previa
            </span>
          </span>
        )}
      </button>
      <div className="space-y-4 p-5">
        <p
          className={cn(
            "font-term text-[34px] leading-none font-extrabold tracking-[-0.02em]",
            (owned || free) && "text-term-accent",
          )}
        >
          {owned ? "ya es tuyo" : free ? "gratis" : formatPrice(course.priceCents, course.currency)}
        </p>
        {actions}
        {!owned && !free && (
          <p className="text-center font-term text-xs text-term-muted">pago seguro con Stripe · acceso inmediato</p>
        )}
        <div className="border-t border-term-border pt-4">
          <p className="mb-2.5 text-sm font-semibold">Este curso incluye:</p>
          <ul className="space-y-2 text-sm text-term-muted [&_svg]:text-term-accent">
            <li className="flex items-center gap-2">
              <Clock className="size-4" /> {formatDuration(course.durationSec)} de video bajo demanda
            </li>
            <li className="flex items-center gap-2">
              <PlayCircle className="size-4" /> {course.chaptersCount} clases
            </li>
            {resourcesCount > 0 && (
              <li className="flex items-center gap-2">
                <Download className="size-4" /> {resourcesCount} recursos descargables
              </li>
            )}
            <li className="flex items-center gap-2">
              <MessagesSquare className="size-4" /> Preguntas y comentarios en cada clase
            </li>
            <li className="flex items-center gap-2">
              <InfinityIcon className="size-4" /> Acceso de por vida
            </li>
            <li className="flex items-center gap-2">
              <Award className="size-4" /> Certificado de finalización
            </li>
          </ul>
        </div>
      </div>
    </TermPanel>
  );
}
