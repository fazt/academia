"use client";

import {
  BookOpen,
  ChartColumn,
  FolderTree,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessagesSquare,
  Monitor,
  Moon,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Star,
  Sun,
  TicketPercent,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { signOut, useSession } from "@/lib/auth-client";

const OPEN_EVENT = "academia:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }>; keywords?: string[] };

// El elemento activo resalta su icono con el acento, como el capítulo actual del aula.
const itemClass = "data-selected:*:[svg]:text-term-accent";

const PUBLIC_ITEMS: Item[] = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Explorar cursos", href: "/cursos", icon: Search, keywords: ["catálogo", "buscar"] },
  { label: "Carrito", href: "/carrito", icon: ShoppingCart, keywords: ["comprar", "pagar"] },
];

const STUDENT_ITEMS: Item[] = [
  { label: "Mis cursos", href: "/mis-cursos", icon: BookOpen, keywords: ["aprendizaje", "continuar"] },
  { label: "Mis compras", href: "/mis-compras", icon: Receipt, keywords: ["pedidos", "facturas"] },
  { label: "Mis certificados", href: "/mis-certificados", icon: GraduationCap },
  { label: "Perfil", href: "/perfil", icon: UserRound, keywords: ["cuenta", "contraseña", "avatar"] },
];

const ADMIN_ITEMS: Item[] = [
  { label: "Panel de administración", href: "/admin", icon: LayoutDashboard, keywords: ["dashboard", "estadísticas"] },
  { label: "Cursos", href: "/admin/cursos", icon: ChartColumn },
  { label: "Nuevo curso", href: "/admin/cursos/nuevo", icon: Plus, keywords: ["crear"] },
  { label: "Categorías", href: "/admin/categorias", icon: FolderTree },
  { label: "Cupones", href: "/admin/cupones", icon: TicketPercent, keywords: ["descuentos"] },
  { label: "Usuarios", href: "/admin/usuarios", icon: Users, keywords: ["alumnos"] },
  { label: "Órdenes", href: "/admin/ordenes", icon: Receipt, keywords: ["ventas", "pagos", "reembolsos"] },
  { label: "Reseñas", href: "/admin/resenas", icon: Star, keywords: ["valoraciones"] },
  { label: "Comentarios y preguntas", href: "/admin/comentarios", icon: MessagesSquare, keywords: ["q&a"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "admin";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const renderItems = (items: Item[]) =>
    items.map((item) => (
      <CommandItem
        key={item.href}
        className={itemClass}
        value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
        onSelect={() => run(() => router.push(item.href))}
      >
        <item.icon />
        {item.label}
      </CommandItem>
    ));

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Paleta de comandos" description="Busca una página o acción">
      <Command className="font-term">
        <CommandInput placeholder="¿A dónde quieres ir?" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Navegación">{renderItems(PUBLIC_ITEMS)}</CommandGroup>
          {session && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Mi aprendizaje">{renderItems(STUDENT_ITEMS)}</CommandGroup>
            </>
          )}
          {isAdmin && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Administración">{renderItems(ADMIN_ITEMS)}</CommandGroup>
            </>
          )}
          <CommandSeparator />
          <CommandGroup heading="Tema">
            <CommandItem className={itemClass} value="tema claro" onSelect={() => run(() => setTheme("light"))}>
              <Sun /> Tema claro
            </CommandItem>
            <CommandItem className={itemClass} value="tema oscuro" onSelect={() => run(() => setTheme("dark"))}>
              <Moon /> Tema oscuro
            </CommandItem>
            <CommandItem className={itemClass} value="tema del sistema" onSelect={() => run(() => setTheme("system"))}>
              <Monitor /> Tema del sistema
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Cuenta">
            {session ? (
              <CommandItem
                className={itemClass}
                value="cerrar sesión salir"
                onSelect={() =>
                  run(async () => {
                    await signOut();
                    router.push("/");
                    router.refresh();
                  })
                }
              >
                <LogOut /> Cerrar sesión
              </CommandItem>
            ) : (
              <>
                <CommandItem
                  className={itemClass}
                  value="iniciar sesión entrar login"
                  onSelect={() => run(() => router.push("/login"))}
                >
                  <LogIn /> Iniciar sesión
                </CommandItem>
                <CommandItem
                  className={itemClass}
                  value="crear cuenta registro"
                  onSelect={() => run(() => router.push("/registro"))}
                >
                  <UserPlus /> Crear cuenta
                </CommandItem>
              </>
            )}
          </CommandGroup>
        </CommandList>
        <div className="flex items-center justify-end gap-1 border-t border-term-border px-3 py-2 text-xs text-term-muted">
          <span className="text-term-accent">$</span> abre esta paleta con{" "}
          <CommandShortcut className="ml-1 rounded border border-term-border px-1.5 py-0.5 tracking-normal">
            ctrl k
          </CommandShortcut>
        </div>
      </Command>
    </CommandDialog>
  );
}
