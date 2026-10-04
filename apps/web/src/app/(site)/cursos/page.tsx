import { COURSE_LEVEL_LABELS, COURSE_LEVELS, courseListQuerySchema } from "@academia/shared";
import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard, CourseGrid } from "@/components/course/course-card";
import { Container, PageHeader } from "@/components/layout/page-header";
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

  // Antetítulo con forma de comando que refleja la búsqueda y los filtros activos.
  const command = [
    query.q ? `grep -i "${query.q}" cursos/` : "ls cursos/",
    query.category && `--categoria=${query.category}`,
    query.level && `--nivel=${query.level}`,
    query.price && `--precio=${query.price === "free" ? "gratis" : "pago"}`,
  ]
    .filter(Boolean)
    .join(" ");

  const filterLink = (label: string, active: boolean, href: string, count?: number) => (
    <Link
      key={label}
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-term-muted transition-colors hover:bg-term-surface hover:text-term-text focus-visible:ring-2 focus-visible:ring-term-accent focus-visible:outline-none",
        active &&
          "bg-[color-mix(in_oklch,var(--term-accent)_12%,var(--term-surface))] font-semibold text-term-accent hover:bg-[color-mix(in_oklch,var(--term-accent)_12%,var(--term-surface))] hover:text-term-accent",
      )}
    >
      {label}
      {count !== undefined && <span className="font-term text-xs text-term-muted">{count}</span>}
    </Link>
  );

  return (
    <Container className="py-10">
      <PageHeader
        className="mb-10"
        command={command}
        title={query.q ? `Resultados para «${query.q}»` : (activeCategory?.name ?? "Explorar cursos")}
        description={
          <span className="font-term text-[13px]">
            {result.total} {result.total === 1 ? "curso" : "cursos"}
            {hasFilters && (
              <>
                {" · "}
                <Link href="/cursos" className="text-term-accent hover:underline">
                  quitar filtros →
                </Link>
              </>
            )}
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="space-y-6">
          <form action="/cursos" role="search" className="lg:hidden">
            <input
              name="q"
              defaultValue={query.q}
              placeholder="buscar cursos…"
              aria-label="Buscar cursos"
              className="h-10 w-full rounded-lg border border-term-border bg-term-surface px-3 font-term text-sm text-term-text outline-none placeholder:text-term-muted focus-visible:border-term-border-strong focus-visible:ring-2 focus-visible:ring-term-accent/40"
            />
          </form>
          <div>
            <h2 className="mb-2 px-2.5 font-term text-[13px] text-term-accent">
              --categoria<span className="sr-only"> (Categoría)</span>
            </h2>
            <nav className="space-y-0.5">
              {filterLink("Todas", !query.category, hrefWith({ category: undefined }))}
              {categories
                .filter((c) => c.coursesCount > 0)
                .map((c) => filterLink(c.name, c.slug === query.category, hrefWith({ category: c.slug }), c.coursesCount))}
            </nav>
          </div>
          <div>
            <h2 className="mb-2 px-2.5 font-term text-[13px] text-term-accent">
              --nivel<span className="sr-only"> (Nivel)</span>
            </h2>
            <nav className="space-y-0.5">
              {filterLink("Todos", !query.level, hrefWith({ level: undefined }))}
              {COURSE_LEVELS.map((level) =>
                filterLink(COURSE_LEVEL_LABELS[level], query.level === level, hrefWith({ level })),
              )}
            </nav>
          </div>
          <div>
            <h2 className="mb-2 px-2.5 font-term text-[13px] text-term-accent">
              --precio<span className="sr-only"> (Precio)</span>
            </h2>
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
            <Empty className="rounded-[14px] border border-term-border-strong">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No encontramos cursos</EmptyTitle>
                <EmptyDescription>Prueba con otra búsqueda o quita algunos filtros.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/cursos">ver todos los cursos</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <CourseGrid className="lg:grid-cols-2 xl:grid-cols-3">
              {result.items.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </CourseGrid>
          )}

          {result.pageCount > 1 && (
            <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Paginación">
              <Button variant="outline" asChild disabled={result.page <= 1} className={cn(result.page <= 1 && "pointer-events-none opacity-50")}>
                <Link href={hrefWith({ page: String(result.page - 1) })}>← anterior</Link>
              </Button>
              <span className="px-3 font-term text-[13px] text-term-muted">
                página {result.page} de {result.pageCount}
              </span>
              <Button
                variant="outline"
                asChild
                className={cn(result.page >= result.pageCount && "pointer-events-none opacity-50")}
              >
                <Link href={hrefWith({ page: String(result.page + 1) })}>siguiente →</Link>
              </Button>
            </nav>
          )}
        </section>
      </div>
    </Container>
  );
}
