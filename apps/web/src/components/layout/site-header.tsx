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
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

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
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Busca cursos, tecnologías…"
          aria-label="Buscar cursos"
        />
      </InputGroup>
    </form>
  );
}

function CartButton() {
  const { count } = useCart();
  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/carrito" aria-label={`Carrito (${count})`}>
        <ShoppingCart />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" asChild className={cn(pathname.startsWith("/cursos") && "bg-muted")}>
            <Link href="/cursos">Explorar</Link>
          </Button>
          {session && (
            <Button variant="ghost" asChild className={cn(pathname.startsWith("/mis-cursos") && "bg-muted")}>
              <Link href="/mis-cursos">Mis cursos</Link>
            </Button>
          )}
        </nav>
        <Suspense fallback={<div className="hidden flex-1 lg:block" />}>
          <SearchBox className="hidden max-w-md flex-1 lg:block" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild className="lg:hidden">
            <Link href="/cursos" aria-label="Buscar cursos">
              <Search />
            </Link>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={openCommandPalette} aria-label="Abrir paleta de comandos">
                <Command />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Paleta de comandos (Ctrl K)</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          <CartButton />
          <div className="ml-1">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
