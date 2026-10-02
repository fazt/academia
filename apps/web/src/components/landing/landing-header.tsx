"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { UserMenu } from "@/components/layout/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";

export function LandingHeader() {
  const { data: session, isPending } = useSession();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-term-border bg-term-bg/85 backdrop-blur supports-[backdrop-filter]:bg-term-bg/70">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 font-term sm:px-10">
        <Link href="/" className="flex items-center text-lg font-extrabold" aria-label="Academia, inicio">
          academia
          <span aria-hidden className="ml-1 inline-block h-5 w-2.5 bg-term-accent" />
        </Link>
        <nav aria-label="Principal" className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-term-muted">
          <Link href="/cursos" className="transition-colors hover:text-term-text">
            cursos/
          </Link>
          <a href="#aula" className="transition-colors hover:text-term-text">
            aula/
          </a>
          <a href="#faq" className="transition-colors hover:text-term-text">
            --help
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link
            href="/carrito"
            aria-label={`Carrito (${count})`}
            className="relative grid size-10 place-items-center rounded-lg text-term-muted transition-colors hover:bg-term-surface hover:text-term-text"
          >
            <ShoppingCart className="size-[18px]" />
            {count > 0 && (
              <span className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-term-accent text-[10px] font-bold text-term-bg">
                {count}
              </span>
            )}
          </Link>
          {isPending ? (
            <Skeleton className="h-9 w-40 bg-term-surface" />
          ) : session ? (
            <>
              <Link href="/mis-cursos" className="px-2 py-2.5 transition-colors hover:text-term-accent">
                mis cursos
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 py-2.5 transition-colors hover:text-term-accent sm:inline">
                iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="rounded-lg bg-term-accent px-4 py-2.5 font-bold text-term-bg transition-opacity hover:opacity-90"
              >
                crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
