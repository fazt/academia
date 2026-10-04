import { COURSE_LEVEL_LABELS } from "@academia/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { RatingSummary } from "@/components/course/rating-stars";
import { ReviewsSection } from "@/components/course/reviews-section";
import { Container } from "@/components/layout/page-header";
import { TermPanel } from "@/components/layout/term";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { fetchOrNull, publicApi } from "@/lib/server-api";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

const getCourse = cache((slug: string) => fetchOrNull(publicApi.courses[":slug"].$get({ param: { slug } })));

export async function generateMetadata({ params }: PageProps<"/cursos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "Curso no encontrado" };
  return {
    title: course.title,
    description: course.subtitle || undefined,
    alternates: { canonical: `/cursos/${course.slug}` },
    openGraph: {
      title: course.title,
      description: course.subtitle || undefined,
      images: course.coverImageUrl ? [course.coverImageUrl] : undefined,
    },
  };
}

const LANGUAGES: Record<string, string> = { es: "Español", en: "Inglés", pt: "Portugués" };

export default async function CoursePage({ params, searchParams }: PageProps<"/cursos/[slug]">) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const course = await getCourse(slug);
  if (!course) notFound();

  const reviewsRes = await publicApi.courses[":slug"].reviews.$get({
    param: { slug },
    query: { page: "1", pageSize: "6" },
  });
  const reviews = reviewsRes.ok
    ? await reviewsRes.json()
    : { items: [], total: 0, page: 1, pageSize: 6, pageCount: 1, distribution: [] };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.subtitle || course.description.slice(0, 300),
    url: `${APP_URL}/cursos/${course.slug}`,
    inLanguage: course.language,
    image: course.coverImageUrl ?? undefined,
    provider: { "@type": "Organization", name: "Academia", sameAs: APP_URL },
    instructor: { "@type": "Person", name: course.instructor.name },
    offers: {
      "@type": "Offer",
      category: course.priceCents === 0 ? "Free" : "Paid",
      price: (course.priceCents / 100).toFixed(2),
      priceCurrency: course.currency,
    },
    hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: `PT${Math.round(course.durationSec / 60)}M` },
    ...(course.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: course.ratingAvg.toFixed(1), ratingCount: course.ratingCount } }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD: se escapa "<" para que el contenido no pueda cerrar la etiqueta.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="border-b border-term-border">
        <Container className="py-10 lg:py-14">
          <div className="flex flex-col gap-5 lg:max-w-[calc(100%-400px)]">
            <nav className="flex flex-wrap items-center gap-x-1 font-term text-[13px] text-term-muted" aria-label="Migas de pan">
              <Link href="/cursos" className="transition-colors hover:text-term-text">
                cursos<span className="text-term-accent">/</span>
              </Link>
              {course.category && (
                <Link href={`/cursos?category=${course.category.slug}`} className="transition-colors hover:text-term-text">
                  {course.category.slug}
                  <span className="text-term-accent">/</span>
                  <span className="sr-only"> ({course.category.name})</span>
                </Link>
              )}
              <span aria-current="page" className="truncate text-term-text">
                {course.slug}
              </span>
            </nav>
            <h1 className="font-term text-[clamp(2rem,4vw,3.25rem)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
              {course.title}
            </h1>
            {course.subtitle && <p className="max-w-[640px] text-[19px] text-pretty text-term-muted">{course.subtitle}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-term text-[13px] text-term-muted">
              <RatingSummary avg={course.ratingAvg} count={course.ratingCount} />
              <span aria-hidden>·</span>
              <span>
                {formatNumber(course.studentsCount)} {course.studentsCount === 1 ? "estudiante" : "estudiantes"}
              </span>
              <span aria-hidden>·</span>
              <span>{COURSE_LEVEL_LABELS[course.level].toLowerCase()}</span>
              <span aria-hidden>·</span>
              <span>{(LANGUAGES[course.language] ?? course.language).toLowerCase()}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-term-muted">
              <span>
                Creado por <span className="font-semibold text-term-text">{course.instructor.name}</span>
              </span>
              <span aria-hidden>·</span>
              <span className="font-term text-[13px]">actualizado el {formatDate(course.updatedAt)}</span>
              <span className="font-term text-[13px] font-extrabold text-term-text lg:hidden">
                · {course.priceCents === 0 ? "gratis" : formatPrice(course.priceCents, course.currency)}
              </span>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <CourseDetailClient
          course={course}
          autoPreview={search.preview === "1"}
          intro={
            course.learningOutcomes.length > 0 && (
              <TermPanel key="intro" title="aprenderas.md">
                <section className="p-6">
                  <h2 className="mb-4 font-term text-2xl font-extrabold tracking-[-0.02em]">
                    <span aria-hidden className="text-term-accent">#</span> Lo que aprenderás
                  </h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {course.learningOutcomes.map((outcome) => (
                      <li key={outcome} className="flex gap-2.5 text-sm">
                        <span aria-hidden className="font-term text-term-ok">
                          ✓
                        </span>
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </section>
              </TermPanel>
            )
          }
        >
          {/* Al cruzar la frontera RSC, React valida los hijos como lista: cada uno lleva key. */}
          <>
            {course.requirements.length > 0 && (
              <section key="requirements">
                <h2 className="mb-4 font-term text-2xl font-extrabold tracking-[-0.02em]">
                  <span aria-hidden className="text-term-accent">#</span> Requisitos
                </h2>
                <ul className="space-y-2 text-sm">
                  {course.requirements.map((req) => (
                    <li key={req} className="flex gap-2.5">
                      <span aria-hidden className="font-term text-term-muted">
                        -
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {course.description && (
              <section key="description">
                <h2 className="mb-4 font-term text-2xl font-extrabold tracking-[-0.02em]">
                  <span aria-hidden className="text-term-accent">#</span> Descripción
                </h2>
                <div className="max-w-[72ch] leading-relaxed whitespace-pre-line text-term-text/90">
                  {course.description}
                </div>
              </section>
            )}

            <TermPanel key="instructor" title="instructor.md">
              <section className="p-6">
                <h2 className="mb-4 font-term text-2xl font-extrabold tracking-[-0.02em]">
                  <span aria-hidden className="text-term-accent">#</span> Instructor
                </h2>
                <div className="flex gap-4">
                  <UserAvatar name={course.instructor.name} image={course.instructor.image} className="size-16 text-lg" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-lg font-semibold">{course.instructor.name}</p>
                    {course.instructor.headline && (
                      <p className="font-term text-[13px] text-term-muted">{course.instructor.headline}</p>
                    )}
                    {course.instructor.bio && (
                      <p className="pt-2 text-sm whitespace-pre-line text-term-text/90">{course.instructor.bio}</p>
                    )}
                  </div>
                </div>
              </section>
            </TermPanel>

            <ReviewsSection
              key="reviews"
              slug={course.slug} ratingAvg={course.ratingAvg} ratingCount={course.ratingCount} initial={reviews} />
          </>
        </CourseDetailClient>
      </Container>
    </>
  );
}
