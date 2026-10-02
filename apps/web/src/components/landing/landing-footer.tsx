import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-term-border">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-8 gap-y-3 px-5 py-8 font-term text-[13px] text-term-muted sm:px-10">
        <span>© {new Date().getFullYear()} academia</span>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/cursos" className="hover:text-term-text">
            cursos/
          </Link>
          <Link href="/terminos" className="hover:text-term-text">
            términos
          </Link>
          <Link href="/privacidad" className="hover:text-term-text">
            privacidad
          </Link>
          <Link href="/reembolsos" className="hover:text-term-text">
            reembolsos
          </Link>
        </nav>
      </div>
    </footer>
  );
}
