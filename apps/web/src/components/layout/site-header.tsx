"use client";

import { Command, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/brand";
import { useCart } from "@/components/cart/cart-provider";
import { openCommandPalette } from "@/components/command-palette";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** Botón de icono de la cabecera, con la forma del carrito de la portada. */
export const headerIconClass =
  "relative grid size-10 shrink-0 place-items-center rounded-lg text-term-muted transition-colors hover:bg-term-surface hover:text-term-text focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none [&_svg]:size-[18px]";

function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  return (
    <form
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        router.push(q ? `/cursos?q=${encodeURIComponent(q)}` : "/cursos");
      }}
    >
      <label className="flex h-10 items-center gap-2 rounded-lg border border-term-border bg-term-surface px-3 text-sm transition-colors focus-within:border-term-border-strong focus-within:ring-2 focus-within:ring-term-accent/40">
        <Search aria-hidden className="size-4 shrink-0 text-term-muted" />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="buscar cursos…"
          aria-label="Buscar cursos"
          className="min-w-0 flex-1 bg-transparent text-term-text outline-none placeholder:text-term-muted"
        />
      </label>
    </form>
  );
}

function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/carrito" aria-label={`Carrito (${count})`} className={headerIconClass}>
      <ShoppingCart />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-term-accent text-[10px] font-bold text-term-bg">
          {count}
        </span>
      )}
    </Link>
  );
}

const NAV = [
  { href: "/cursos", label: "cursos/", match: "/cursos" },
  { href: "/#aula", label: "aula/" },
  { href: "/#faq", label: "--help" },
];

/** Cabecera de todo el sitio, en la dirección "Terminal" de la portada. */
export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-term-border bg-term-bg/85 backdrop-blur supports-[backdrop-filter]:bg-term-bg/70">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4 font-term sm:px-10">
        <Logo />
        <nav aria-label="Principal" className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-term-muted">
          {NAV.map((item) => {
            const active = !!item.match && pathname.startsWith(item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("transition-colors hover:text-term-text", active && "text-term-text")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Suspense fallback={<div className="hidden max-w-[280px] flex-1 xl:block" />}>
          <SearchBox className="hidden max-w-[280px] flex-1 xl:block" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/cursos" aria-label="Buscar cursos" className={cn(headerIconClass, "xl:hidden")}>
            <Search />
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={openCommandPalette}
                aria-label="Abrir paleta de comandos"
                className={cn(headerIconClass, "hidden sm:grid")}
              >
                <Command />
              </button>
            </TooltipTrigger>
            <TooltipContent>Paleta de comandos (Ctrl K)</TooltipContent>
          </Tooltip>
          <ThemeToggle className={headerIconClass} />
          <CartLink />
          {isPending ? (
            <Skeleton className="ml-1 h-9 w-40 bg-term-surface" />
          ) : session ? (
            <>
              <Link
                href="/mis-cursos"
                aria-current={pathname.startsWith("/mis-cursos") ? "page" : undefined}
                className={cn(
                  "hidden px-2 py-2.5 transition-colors hover:text-term-accent sm:inline",
                  pathname.startsWith("/mis-cursos") && "text-term-accent",
                )}
              >
                mis cursos
              </Link>
              <div className="ml-1">
                <UserMenu />
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 py-2.5 transition-colors hover:text-term-accent sm:inline">
                iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="ml-1 rounded-lg bg-term-accent px-4 py-2.5 font-bold text-term-bg transition-opacity hover:opacity-90"
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
