"use client";

import { BookOpen, GraduationCap, LayoutDashboard, LogOut, Receipt, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  if (isPending) return <Skeleton className="size-8 rounded-full" />;

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild className="hidden sm:inline-flex">
          <Link href="/login">iniciar sesión</Link>
        </Button>
        <Button asChild>
          <Link href="/registro">crear cuenta</Link>
        </Button>
      </div>
    );
  }

  const { user } = session;
  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full ring-1 ring-term-border transition-shadow hover:ring-term-border-strong focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none" aria-label="Menú de usuario">
          <UserAvatar name={user.name} image={user.image} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 font-term">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-sans text-sm font-semibold text-term-text">{user.name}</span>
          <span className="truncate text-xs font-normal text-term-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/mis-cursos">
              <BookOpen /> mis cursos
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/mis-compras">
              <Receipt /> mis compras
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/mis-certificados">
              <GraduationCap /> mis certificados
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <UserRound /> perfil
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {user.role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <LayoutDashboard /> administración
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut /> cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
