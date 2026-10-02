import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/mis-cursos", "/mis-compras", "/mis-certificados", "/perfil", "/aprender", "/admin"];
const GUEST_ONLY = ["/login", "/registro", "/forgot-password"];

/**
 * Solo comprueba si existe la cookie de sesión para redirigir rápido. La
 * autorización real (rol, matrícula) la hace siempre la API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = !!getSessionCookie(request);

  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (hasSession && GUEST_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/mis-cursos", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // /api queda fuera: lo proxyean los rewrites hacia Hono.
  matcher: [
    "/mis-cursos/:path*",
    "/mis-compras/:path*",
    "/mis-certificados/:path*",
    "/perfil/:path*",
    "/aprender/:path*",
    "/admin/:path*",
    "/login",
    "/registro",
    "/forgot-password",
  ],
};
