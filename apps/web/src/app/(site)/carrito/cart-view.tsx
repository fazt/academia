"use client";

import { Info, ShoppingCart, TicketPercent, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { type CartSummary, useCart } from "@/components/cart/cart-provider";
import { CourseCover } from "@/components/course/course-cover";
import { Container, PageHeader } from "@/components/layout/page-header";
import { TermPanel } from "@/components/layout/term";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
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
        <Empty className="rounded-[14px] border border-term-border-strong">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCart />
            </EmptyMedia>
            <EmptyTitle>Tu carrito está vacío</EmptyTitle>
            <EmptyDescription>Explora el catálogo y añade los cursos que quieras aprender.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/cursos">explorar cursos</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Container>
    );
  }

  return (
    <Container className="space-y-8 py-10">
      <PageHeader
        command="cat carrito.txt"
        title="Carrito"
        description={
          <span className="font-term text-[13px]">
            {summary.items.length} {summary.items.length === 1 ? "curso" : "cursos"} en el carrito
          </span>
        }
      />

      {params.get("cancelado") && (
        <div className="flex items-center gap-3 rounded-[14px] border border-term-border bg-term-surface px-4 py-3 text-sm">
          <Info className="size-4 shrink-0 text-term-key" />
          Cancelaste el pago. Tus cursos siguen en el carrito por si quieres terminar la compra.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <TermPanel title="carrito/" className="h-fit">
          <ul className="divide-y divide-term-border">
            {summary.items.map((item) => (
              <li key={item.id} className="flex gap-4 p-4 sm:p-5">
                <Link
                  href={`/cursos/${item.slug}`}
                  className="w-32 shrink-0 overflow-hidden rounded-[10px] border border-term-border sm:w-40"
                  tabIndex={-1}
                  aria-hidden
                >
                  <CourseCover title={item.title} src={item.coverImageUrl} className="p-3 text-xs [&_span]:text-sm" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/cursos/${item.slug}`} className="line-clamp-2 font-semibold transition-colors hover:text-term-accent">
                    {item.title}
                  </Link>
                  <p className="font-term text-xs text-term-muted">{item.instructor.name}</p>
                  <button
                    type="button"
                    onClick={() => cart.remove(item.id)}
                    className="mt-auto inline-flex w-fit items-center gap-1 font-term text-xs text-term-muted transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" /> quitar
                  </button>
                </div>
                <div className="text-right font-term">
                  <p className="font-extrabold">{formatPrice(item.totalCents, item.currency)}</p>
                  {item.discountCents > 0 && (
                    <p className="text-xs text-term-muted line-through">{formatPrice(item.priceCents, item.currency)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </TermPanel>

        <TermPanel title="resumen.txt" className="h-fit lg:sticky lg:top-24">
          <div className="space-y-4 p-5">
            <div className="space-y-2 font-term text-[13px]">
              <div className="flex justify-between">
                <span className="text-term-muted">subtotal</span>
                <span>{formatPrice(summary.subtotalCents, summary.currency)}</span>
              </div>
              {summary.discountCents > 0 && (
                <div className="flex justify-between text-term-ok">
                  <span>descuento {summary.couponCode && `(${summary.couponCode})`}</span>
                  <span>-{formatPrice(summary.discountCents, summary.currency)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-term-border pt-3">
                <span className="font-bold">total</span>
                <span className="text-2xl font-extrabold tracking-[-0.02em]">
                  {formatPrice(summary.totalCents, summary.currency)}
                </span>
              </div>
            </div>

            {cart.isGuest ? (
              <div className="space-y-2">
                <Button size="lg" className="h-11 w-full" asChild>
                  <Link href="/login?redirect=/carrito">inicia sesión para pagar</Link>
                </Button>
                <p className="text-center font-term text-xs text-term-muted">Guardaremos tu carrito al iniciar sesión.</p>
              </div>
            ) : (
              <>
                {discounted?.couponCode ? (
                  <div className="flex items-center justify-between rounded-[10px] border border-dashed border-term-ok/50 bg-term-ok/5 px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 font-term font-bold">
                      <TicketPercent className="size-4 text-term-ok" /> {discounted.couponCode}
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
                      className="font-term"
                    />
                    <Button type="submit" variant="outline" disabled={applying || !code.trim()}>
                      {applying && <Spinner />} aplicar
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
                  {summary.totalCents === 0 ? "obtener acceso" : "ir a pagar"}
                </Button>
                <p className="text-center text-xs text-term-muted">
                  Pago seguro con Stripe. Al comprar aceptas la{" "}
                  <Link href="/reembolsos" className="underline underline-offset-4 hover:text-term-text">
                    política de reembolsos
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        </TermPanel>
      </div>
    </Container>
  );
}
