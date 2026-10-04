"use client";

import {
  BookOpen,
  Command,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Receipt,
  ShieldAlert,
  Star,
  TicketPercent,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand";
import { openCommandPalette } from "@/components/command-palette";
import { headerIconClass } from "@/components/layout/site-header";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV = [
  {
    label: "general",
    items: [{ href: "/admin", label: "panel", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "catálogo",
    items: [
      { href: "/admin/cursos", label: "cursos/", icon: BookOpen },
      { href: "/admin/categorias", label: "categorías/", icon: FolderTree },
      { href: "/admin/cupones", label: "cupones/", icon: TicketPercent },
    ],
  },
  {
    label: "ventas y alumnos",
    items: [
      { href: "/admin/ordenes", label: "órdenes/", icon: Receipt },
      { href: "/admin/usuarios", label: "usuarios/", icon: Users },
    ],
  },
  {
    label: "comunidad",
    items: [
      { href: "/admin/resenas", label: "reseñas/", icon: Star },
      { href: "/admin/comentarios", label: "comentarios/", icon: MessagesSquare },
    ],
  },
];

/** Navegación del panel, como la de la portada: monoespaciada, en minúsculas y con grupos comentados. */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6 font-term" aria-label="Administración">
      {NAV.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs text-term-muted">
            <span className="text-term-accent">#</span> {group.label}
          </p>
          {group.items.map((item) => {
            const active =
              "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none",
                  active
                    ? "bg-[color-mix(in_oklch,var(--term-accent)_12%,transparent)] font-bold text-term-accent"
                    : "text-term-muted hover:bg-term-surface hover:text-term-text",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <Button variant="outline" size="sm" asChild className="w-full justify-start">
      <Link href="/">
        <ExternalLink /> ver la web
      </Link>
    </Button>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlert />
            </EmptyMedia>
            <EmptyTitle>Sin acceso</EmptyTitle>
            <EmptyDescription>Esta sección es solo para administradores.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/">volver al inicio</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh bg-term-bg">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-7 border-r border-term-border bg-term-bg px-3 py-5 lg:flex">
        <div className="flex items-baseline gap-2 px-3">
          <Logo href="/admin" />
          <span className="font-term text-xs text-term-muted">admin</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-0 border-term-border bg-term-bg p-0">
          <SheetHeader className="border-b border-term-border">
            <SheetTitle>
              <Logo href="/admin" />
            </SheetTitle>
            <SheetDescription className="sr-only">Navegación del panel de administración</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto">
              <SidebarFooter />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[73px] items-center gap-2 border-b border-term-border bg-term-bg/85 px-5 font-term backdrop-blur supports-[backdrop-filter]:bg-term-bg/70 sm:px-10">
          <button
            type="button"
            className={cn(headerIconClass, "-ml-2 lg:hidden")}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu />
          </button>
          <span className="text-sm font-bold lg:hidden">admin/</span>
          <div className="ml-auto flex items-center gap-1 text-sm">
            <button
              type="button"
              onClick={openCommandPalette}
              className="hidden h-10 w-64 items-center gap-2 rounded-lg border border-term-border bg-term-surface px-3 text-term-muted transition-colors hover:border-term-border-strong hover:text-term-text focus-visible:ring-2 focus-visible:ring-term-accent/40 focus-visible:outline-none sm:inline-flex"
            >
              <Command className="size-4" />
              <span className="flex-1 text-left">buscar…</span>
              <kbd className="rounded border border-term-border bg-term-raised px-1.5 text-[10px]">Ctrl K</kbd>
            </button>
            <button
              type="button"
              className={cn(headerIconClass, "sm:hidden")}
              onClick={openCommandPalette}
              aria-label="Paleta de comandos"
            >
              <Command />
            </button>
            <ThemeToggle className={headerIconClass} />
            <div className="ml-1">
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8 sm:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
