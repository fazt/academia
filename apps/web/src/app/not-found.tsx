import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-heading text-7xl font-extrabold text-primary/80">404</p>
        <h1 className="mt-4 font-heading text-2xl font-bold">No encontramos esta página</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Puede que el enlace esté roto o que el curso ya no esté disponible.
        </p>
        <div className="mt-6 flex gap-2">
          <Button asChild>
            <Link href="/cursos">Explorar cursos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
