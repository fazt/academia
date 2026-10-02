import { COURSE_LEVEL_LABELS } from "@academia/shared";
import { Check, Globe, RefreshCw, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CourseDetailClient } from "@/components/course/course-detail-client";
import { RatingSummary } from "@/components/course/rating-stars";
import { ReviewsSection } from "@/components/course/reviews-section";
import { Container } from "@/components/layout/page-header";
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

      <section className="bg-neutral-950 text-neutral-50">
        <Container className="py-10 lg:py-14">
          <div className="max-w-3xl space-y-4 lg:pr-8 xl:max-w-[calc(100%-400px)]">
            <nav className="flex items-center gap-2 text-sm text-neutral-400" aria-label="Migas de pan">
              <Link href="/cursos" className="hover:text-white">
                Cursos
              </Link>
              {course.category && (
                <>
                  <span>/</span>
                  <Link href={`/cursos?category=${course.category.slug}`} className="text-indigo-300 hover:text-white">
                    {course.category.name}
                  </Link>
                </>
              )}
            </nav>
            <h1 className="font-heading text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
              {course.title}
            </h1>
            {course.subtitle && <p className="text-lg text-neutral-300">{course.subtitle}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm [&_.text-muted-foreground]:text-neutral-400">
              <RatingSummary avg={course.ratingAvg} count={course.ratingCount} />
              <span className="inline-flex items-center gap-1.5 text-neutral-300">
                <Users className="size-4" /> {formatNumber(course.studentsCount)}{" "}
                {course.studentsCount === 1 ? "estudiante" : "estudiantes"}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{COURSE_LEVEL_LABELS[course.level]}</span>
            </div>
            <p className="text-sm text-neutral-300">
              Creado por <span className="font-medium text-indigo-300">{course.instructor.name}</span>
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="size-4" /> Actualizado el {formatDate(course.updatedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-4" /> {LANGUAGES[course.language] ?? course.language}
              </span>
              <span className="lg:hidden">· {formatPrice(course.priceCents, course.currency)}</span>
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
              <section key="intro" className="rounded-xl border p-6">
                <h2 className="mb-4 font-heading text-2xl font-bold">Lo que aprenderás</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {course.learningOutcomes.map((outcome) => (
                    <li key={outcome} className="flex gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {outcome}
                    </li>
                  ))}
                </ul>
              </section>
            )
          }
        >
          {/* Al cruzar la frontera RSC, React valida los hijos como lista: cada uno lleva key. */}
          <>
            {course.requirements.length > 0 && (
              <section key="requirements">
                <h2 className="mb-3 font-heading text-2xl font-bold">Requisitos</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm">
                  {course.requirements.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </section>
            )}

            {course.description && (
              <section key="description">
                <h2 className="mb-3 font-heading text-2xl font-bold">Descripción</h2>
                <div className="max-w-none text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                  {course.description}
                </div>
              </section>
            )}

            <section key="instructor">
              <h2 className="mb-4 font-heading text-2xl font-bold">Instructor</h2>
              <div className="flex gap-4">
                <UserAvatar name={course.instructor.name} image={course.instructor.image} className="size-16 text-lg" />
                <div className="space-y-1">
                  <p className="font-heading text-lg font-semibold text-primary">{course.instructor.name}</p>
                  {course.instructor.headline && <p className="text-sm text-muted-foreground">{course.instructor.headline}</p>}
                  {course.instructor.bio && <p className="pt-2 text-sm whitespace-pre-line">{course.instructor.bio}</p>}
                </div>
              </div>
            </section>

            <ReviewsSection
              key="reviews"
              slug={course.slug} ratingAvg={course.ratingAvg} ratingCount={course.ratingCount} initial={reviews} />
          </>
        </CourseDetailClient>
      </Container>
    </>
  );
}
