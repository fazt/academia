"use client";

import { Info, ShoppingCart, TicketPercent, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { type CartSummary, useCart } from "@/components/cart/cart-provider";
import { CourseCover } from "@/components/course/course-cover";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useCheckout } from "@/hooks/use-checkout";
import { api, call, errorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export function CartView() {
  const params = useSearchParams();
  const cart = useCart();
  const { checkout, pending } = useCheckout();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  // El descuento se guarda junto al contenido del carrito para el que se calculó:
  // si el carrito cambia, deja de aplicarse y hay que validar el cupón otra vez.
  const [coupon, setCoupon] = useState<{ itemsKey: string; summary: CartSummary } | null>(null);
  const itemsKey = cart.summary?.items.map((i) => i.id).join(",") ?? "";
  const discounted = coupon?.itemsKey === itemsKey ? coupon.summary : null;
  const setDiscounted = (summary: CartSummary | null) => setCoupon(summary ? { itemsKey, summary } : null);

  const summary = discounted ?? cart.summary;

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setApplying(true);
    try {
      setDiscounted(await call(api.coupons.validate.$post({ json: { code: code.trim() } })));
      toast.success("Cupón aplicado");
    } catch (error) {
      setDiscounted(null);
      toast.error(errorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  if (cart.isLoading) {
    return (
      <Container className="space-y-6 py-10">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Container>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <Container className="py-16">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCart />
            </EmptyMedia>
            <EmptyTitle>Tu carrito está vacío</EmptyTitle>
            <EmptyDescription>Explora el catálogo y añade los cursos que quieras aprender.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/cursos">Explorar cursos</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Container>
    );
  }

  return (
    <Container className="space-y-8 py-10">
      <PageHeader
        title="Carrito"
        description={`${summary.items.length} ${summary.items.length === 1 ? "curso" : "cursos"} en el carrito`}
      />

      {params.get("cancelado") && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
          <Info className="size-4 shrink-0 text-primary" />
          Cancelaste el pago. Tus cursos siguen en el carrito por si quieres terminar la compra.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y rounded-xl border">
          {summary.items.map((item) => (
            <li key={item.id} className="flex gap-4 p-4">
              <Link href={`/cursos/${item.slug}`} className="w-32 shrink-0 overflow-hidden rounded-lg sm:w-40">
                <CourseCover title={item.title} src={item.coverImageUrl} className="text-xs [&_span]:text-sm" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/cursos/${item.slug}`} className="line-clamp-2 font-semibold hover:text-primary">
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground">{item.instructor.name}</p>
                <button
                  type="button"
                  onClick={() => cart.remove(item.id)}
                  className="mt-auto inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Quitar
                </button>
              </div>
              <div className="text-right">
                <p className="font-heading font-bold">{formatPrice(item.totalCents, item.currency)}</p>
                {item.discountCents > 0 && (
                  <p className="text-xs text-muted-foreground line-through">{formatPrice(item.priceCents, item.currency)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-4 rounded-xl border p-5 lg:sticky lg:top-24">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(summary.subtotalCents, summary.currency)}</span>
            </div>
            {summary.discountCents > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Descuento {summary.couponCode && `(${summary.couponCode})`}</span>
                <span>-{formatPrice(summary.discountCents, summary.currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-heading text-2xl font-bold">{formatPrice(summary.totalCents, summary.currency)}</span>
            </div>
          </div>

          {cart.isGuest ? (
            <div className="space-y-2">
              <Button size="lg" className="h-11 w-full" asChild>
                <Link href="/login?redirect=/carrito">Inicia sesión para pagar</Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">Guardaremos tu carrito al iniciar sesión.</p>
            </div>
          ) : (
            <>
              {discounted?.couponCode ? (
                <div className="flex items-center justify-between rounded-lg border border-dashed border-emerald-500/50 bg-emerald-500/5 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <TicketPercent className="size-4 text-emerald-600" /> {discounted.couponCode}
                  </span>
                  <Button variant="ghost" size="icon-xs" aria-label="Quitar cupón" onClick={() => setDiscounted(null)}>
                    <X />
                  </Button>
                </div>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void applyCoupon();
                  }}
                >
                  <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    placeholder="Código de cupón"
                    aria-label="Código de cupón"
                  />
                  <Button type="submit" variant="outline" disabled={applying || !code.trim()}>
                    {applying && <Spinner />} Aplicar
                  </Button>
                </form>
              )}
              <Button
                size="lg"
                className="h-11 w-full"
                disabled={pending}
                onClick={() => checkout({ couponCode: discounted?.couponCode ?? undefined })}
              >
                {pending && <Spinner />}
                {summary.totalCents === 0 ? "Obtener acceso" : "Ir a pagar"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Pago seguro con Stripe. Al comprar aceptas la{" "}
                <Link href="/reembolsos" className="underline">
                  política de reembolsos
                </Link>
                .
              </p>
            </>
          )}
        </aside>
      </div>
    </Container>
  );
}
