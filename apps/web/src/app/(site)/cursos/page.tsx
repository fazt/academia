import { COURSE_LEVEL_LABELS, COURSE_LEVELS, courseListQuerySchema } from "@academia/shared";
import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard, CourseGrid } from "@/components/course/course-card";
import { Container } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { publicApi } from "@/lib/server-api";
import { cn } from "@/lib/utils";
import { CatalogSort } from "./catalog-sort";

export const metadata: Metadata = {
  title: "Explorar cursos",
  description: "Encuentra cursos en video de programación, datos, diseño y más.",
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({ searchParams }: PageProps<"/cursos">) {
  const raw = (await searchParams) as Search;
  const rawQuery = {
    q: first(raw.q),
    category: first(raw.category),
    level: first(raw.level),
    price: first(raw.price),
    sort: first(raw.sort),
    page: first(raw.page),
  };
  const parsed = courseListQuerySchema.safeParse(rawQuery);
  const query = parsed.success ? parsed.data : courseListQuerySchema.parse({});

  // Construye enlaces conservando el resto de filtros (y volviendo a la página 1).
  const hrefWith = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...rawQuery, page: undefined, ...changes };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const qs = next.toString();
    return qs ? `/cursos?${qs}` : "/cursos";
  };

  const apiQuery: Record<string, string> = { page: String(query.page), pageSize: "12" };
  if (query.q) apiQuery.q = query.q;
  if (query.category) apiQuery.category = query.category;
  if (query.level) apiQuery.level = query.level;
  if (query.price) apiQuery.price = query.price;
  if (query.sort) apiQuery.sort = query.sort;

  const [coursesRes, categoriesRes] = await Promise.all([
    publicApi.courses.$get({ query: apiQuery }),
    publicApi.categories.$get(),
  ]);
  if (!coursesRes.ok) throw new Error("No se pudo cargar el catálogo");
  const result = await coursesRes.json();
  const categories = categoriesRes.ok ? (await categoriesRes.json()).items : [];
  const activeCategory = categories.find((c) => c.slug === query.category);
  const hasFilters = !!(query.q || query.category || query.level || query.price);

  const filterLink = (label: string, active: boolean, href: string, count?: number) => (
    <Link
      key={label}
      href={href}
      scroll={false}
      className={cn(
        "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
        active && "bg-primary/10 font-medium text-primary hover:bg-primary/15",
      )}
    >
      {label}
      {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
    </Link>
  );

  return (
    <Container className="py-10">
      <div className="mb-8 space-y-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {query.q ? `Resultados para «${query.q}»` : (activeCategory?.name ?? "Explorar cursos")}
        </h1>
        <p className="text-muted-foreground">
          {result.total} {result.total === 1 ? "curso" : "cursos"}
          {hasFilters && (
            <>
              {" · "}
              <Link href="/cursos" className="text-primary hover:underline">
                Quitar filtros
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="space-y-6">
          <form action="/cursos" className="lg:hidden">
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Buscar cursos…"
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </form>
          <div>
            <h2 className="mb-2 px-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Categoría</h2>
            <nav className="space-y-0.5">
              {filterLink("Todas", !query.category, hrefWith({ category: undefined }))}
              {categories
                .filter((c) => c.coursesCount > 0)
                .map((c) => filterLink(c.name, c.slug === query.category, hrefWith({ category: c.slug }), c.coursesCount))}
            </nav>
          </div>
          <div>
            <h2 className="mb-2 px-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Nivel</h2>
            <nav className="space-y-0.5">
              {filterLink("Todos", !query.level, hrefWith({ level: undefined }))}
              {COURSE_LEVELS.map((level) =>
                filterLink(COURSE_LEVEL_LABELS[level], query.level === level, hrefWith({ level })),
              )}
            </nav>
          </div>
          <div>
            <h2 className="mb-2 px-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Precio</h2>
            <nav className="space-y-0.5">
              {filterLink("Todos", !query.price, hrefWith({ price: undefined }))}
              {filterLink("Gratis", query.price === "free", hrefWith({ price: "free" }))}
              {filterLink("De pago", query.price === "paid", hrefWith({ price: "paid" }))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          <div className="flex justify-end">
            <CatalogSort value={query.sort ?? "popular"} />
          </div>

          {result.items.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No encontramos cursos</EmptyTitle>
                <EmptyDescription>Prueba con otra búsqueda o quita algunos filtros.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/cursos">Ver todos los cursos</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <CourseGrid className="xl:grid-cols-3">
              {result.items.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </CourseGrid>
          )}

          {result.pageCount > 1 && (
            <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Paginación">
              <Button variant="outline" asChild disabled={result.page <= 1} className={cn(result.page <= 1 && "pointer-events-none opacity-50")}>
                <Link href={hrefWith({ page: String(result.page - 1) })}>Anterior</Link>
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                Página {result.page} de {result.pageCount}
              </span>
              <Button
                variant="outline"
                asChild
                className={cn(result.page >= result.pageCount && "pointer-events-none opacity-50")}
              >
                <Link href={hrefWith({ page: String(result.page + 1) })}>Siguiente</Link>
              </Button>
            </nav>
          )}
        </section>
      </div>
    </Container>
  );
}
