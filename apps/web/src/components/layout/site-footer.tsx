import Link from "next/link";
import { Logo } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Cursos en video para aprender a tu ritmo, con certificados y una comunidad que responde tus dudas.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Aprender</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/cursos">Explorar cursos</Link></li>
            <li><Link className="hover:text-foreground" href="/cursos?price=free">Cursos gratis</Link></li>
            <li><Link className="hover:text-foreground" href="/mis-cursos">Mis cursos</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Cuenta</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/registro">Crear cuenta</Link></li>
            <li><Link className="hover:text-foreground" href="/login">Iniciar sesión</Link></li>
            <li><Link className="hover:text-foreground" href="/mis-certificados">Certificados</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Legal</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/terminos">Términos y condiciones</Link></li>
            <li><Link className="hover:text-foreground" href="/privacidad">Política de privacidad</Link></li>
            <li><Link className="hover:text-foreground" href="/reembolsos">Política de reembolsos</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Academia. Todos los derechos reservados.
      </div>
    </footer>
  );
}
