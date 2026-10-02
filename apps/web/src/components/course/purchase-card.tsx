"use client";

import { Award, Clock, Download, Infinity as InfinityIcon, MessagesSquare, PlayCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { CourseCover } from "@/components/course/course-cover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useCheckout } from "@/hooks/use-checkout";
import { useLibrary } from "@/hooks/use-library";
import { formatDuration, formatPrice } from "@/lib/format";

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
          <PlayCircle /> Ir al curso
        </Link>
      </Button>
    );
  } else if (free) {
    actions = (
      <Button size="lg" className="h-11 w-full" disabled={pending} onClick={() => checkout({ courseId: course.id })}>
        {pending && <Spinner />} Inscribirme gratis
      </Button>
    );
  } else {
    actions = (
      <div className="space-y-2">
        {inCart ? (
          <Button size="lg" className="h-11 w-full" asChild>
            <Link href="/carrito">
              <ShoppingCart /> Ir al carrito
            </Link>
          </Button>
        ) : (
          <Button size="lg" className="h-11 w-full" onClick={() => cart.add(course.id)}>
            <ShoppingCart /> Añadir al carrito
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className="h-11 w-full"
          disabled={pending}
          onClick={() => checkout({ courseId: course.id })}
        >
          {pending && <Spinner />} Comprar ahora
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xl shadow-primary/5">
      <button
        type="button"
        onClick={onPreview}
        disabled={!hasPreview}
        className="group relative block w-full disabled:cursor-default"
        aria-label="Ver vista previa del curso"
      >
        <CourseCover title={course.title} src={course.coverImageUrl} />
        {hasPreview && (
          <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-90 transition-opacity group-hover:bg-black/40">
            <span className="flex flex-col items-center gap-2 text-sm font-semibold text-white">
              <PlayCircle className="size-12" strokeWidth={1.5} />
              Vista previa del curso
            </span>
          </span>
        )}
      </button>
      <div className="space-y-4 p-5">
        <p className="font-heading text-3xl font-bold">{owned ? "Ya es tuyo" : formatPrice(course.priceCents, course.currency)}</p>
        {actions}
        {!owned && !free && (
          <p className="text-center text-xs text-muted-foreground">Pago seguro con Stripe · Acceso inmediato</p>
        )}
        <div>
          <p className="mb-2 text-sm font-semibold">Este curso incluye:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
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
    </div>
  );
}
