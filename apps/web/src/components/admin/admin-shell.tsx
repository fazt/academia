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
    label: "General",
    items: [{ href: "/admin", label: "Panel", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/cursos", label: "Cursos", icon: BookOpen },
      { href: "/admin/categorias", label: "Categorías", icon: FolderTree },
      { href: "/admin/cupones", label: "Cupones", icon: TicketPercent },
    ],
  },
  {
    label: "Ventas y alumnos",
    items: [
      { href: "/admin/ordenes", label: "Órdenes", icon: Receipt },
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    ],
  },
  {
    label: "Comunidad",
    items: [
      { href: "/admin/resenas", label: "Reseñas", icon: Star },
      { href: "/admin/comentarios", label: "Comentarios y preguntas", icon: MessagesSquare },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5" aria-label="Administración">
      {NAV.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
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
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
        <ExternalLink /> Ver la web
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
              <Link href="/">Volver al inicio</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh bg-muted/30">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r bg-background px-3 py-4 lg:flex">
        <div className="px-2">
          <Logo href="/admin" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="border-b">
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
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu />
          </Button>
          <span className="font-heading font-semibold lg:hidden">Administración</span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="sm" className="hidden gap-2 text-muted-foreground sm:inline-flex" onClick={openCommandPalette}>
              <Command /> Buscar
              <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Ctrl K</kbd>
            </Button>
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={openCommandPalette} aria-label="Paleta de comandos">
              <Command />
            </Button>
            <ThemeToggle />
            <div className="ml-1">
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
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
