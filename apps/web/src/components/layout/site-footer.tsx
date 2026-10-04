import Link from "next/link";

const LINKS = [
  { href: "/cursos", label: "cursos/" },
  { href: "/mis-certificados", label: "certificados" },
  { href: "/terminos", label: "términos" },
  { href: "/privacidad", label: "privacidad" },
  { href: "/reembolsos", label: "reembolsos" },
];

/** Pie de todo el sitio, en la dirección "Terminal" de la portada. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-term-border">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-8 gap-y-3 px-5 py-8 font-term text-[13px] text-term-muted sm:px-10">
        <span>© {new Date().getFullYear()} academia</span>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-term-text">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
