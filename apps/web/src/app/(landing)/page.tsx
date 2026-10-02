import { Classroom } from "@/components/landing/classroom";
import { CourseList } from "@/components/landing/course-list";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { Testimonials } from "@/components/landing/testimonials";
import { publicApi, tryJson } from "@/lib/server-api";

export default async function LandingPage() {
  // Cada bloque degrada por separado: si la API no responde (p. ej. en el build), la portada se muestra igual.
  const [popular, freeCourses, stats, reviews] = await Promise.all([
    tryJson(publicApi.courses.$get({ query: { sort: "popular", pageSize: "5" } })),
    tryJson(publicApi.courses.$get({ query: { price: "free", sort: "popular", pageSize: "1" } })),
    tryJson(publicApi.stats.$get()),
    tryJson(publicApi.reviews.featured.$get({ query: { limit: "3" } })),
  ]);

  const courses = popular?.items ?? [];
  const featuredSlug = courses[0]?.slug;
  const featured = featuredSlug
    ? await tryJson(publicApi.courses[":slug"].$get({ param: { slug: featuredSlug } }))
    : null;
  const free = freeCourses?.items[0];
  const freeCourse = free ? { title: free.title, slug: free.slug } : null;

  return (
    <>
      <Hero featured={featured} students={stats?.students ?? 0} freeCourse={freeCourse} />
      <CourseList courses={courses} total={popular?.total ?? 0} />
      <Classroom courseTitle={featured?.title ?? null} />
      <Testimonials reviews={reviews?.items ?? []} />
      <Faq />
      <FinalCta freeCourse={freeCourse} />
    </>
  );
}
