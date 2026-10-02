import { courseListQuerySchema, formatDuration, pageQuerySchema } from "@academia/shared";
import {
  type SQL,
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import {
  categories,
  certificates,
  chapterResources,
  chapters,
  courses,
  enrollments,
  reviews,
  user,
} from "../db/schema";
import { env } from "../env";
import { renderCertificatePdf } from "../lib/certificate-pdf";
import { notFound } from "../lib/errors";
import { likePattern, offsetOf, paginate } from "../lib/pagination";
import { validate } from "../lib/validate";
import type { AppEnv } from "../middleware/auth";
import { courseCardQuery, loadCurriculum } from "../services/course-queries";

async function loadCertificate(code: string) {
  const [row] = await db
    .select({
      code: certificates.code,
      issuedAt: certificates.issuedAt,
      studentName: user.name,
      course: {
        title: courses.title,
        slug: courses.slug,
        durationSec: courses.durationSec,
        instructorId: courses.instructorId,
      },
    })
    .from(certificates)
    .innerJoin(user, eq(user.id, certificates.userId))
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .where(eq(certificates.code, code.toUpperCase()))
    .limit(1);
  if (!row) throw notFound("Certificado no encontrado");
  const instructor = await db.query.user.findFirst({
    columns: { name: true },
    where: eq(user.id, row.course.instructorId),
  });
  return {
    code: row.code,
    issuedAt: row.issuedAt,
    studentName: row.studentName,
    course: { title: row.course.title, slug: row.course.slug, durationSec: row.course.durationSec },
    instructorName: instructor?.name ?? "",
  };
}

export const publicRoutes = new Hono<AppEnv>()
  /** Cifras públicas para la portada. */
  .get("/stats", async (c) => {
    const [[published], [students]] = await Promise.all([
      db.select({ value: count() }).from(courses).where(eq(courses.status, "published")),
      db
        .select({ value: countDistinct(enrollments.userId) })
        .from(enrollments)
        .where(isNull(enrollments.revokedAt)),
    ]);
    return c.json({ publishedCourses: published?.value ?? 0, students: students?.value ?? 0 });
  })

  /** Reseñas recientes con texto y 4-5 estrellas de cursos publicados (testimonios de la portada). */
  .get(
    "/reviews/featured",
    validate("query", z.object({ limit: z.coerce.number().int().min(1).max(12).default(3) })),
    async (c) => {
      const { limit } = c.req.valid("query");
      const items = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          body: reviews.body,
          createdAt: reviews.createdAt,
          author: { name: user.name },
          course: { title: courses.title, slug: courses.slug },
        })
        .from(reviews)
        .innerJoin(user, eq(user.id, reviews.userId))
        .innerJoin(courses, eq(courses.id, reviews.courseId))
        .where(
          and(
            eq(reviews.hidden, false),
            gte(reviews.rating, 4),
            ne(reviews.body, ""),
            eq(courses.status, "published"),
          ),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(limit);
      return c.json({ items });
    },
  )

  .get("/categories", async (c) => {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        coursesCount: sql<number>`count(${courses.id})::int`,
      })
      .from(categories)
      .leftJoin(courses, and(eq(courses.categoryId, categories.id), eq(courses.status, "published")))
      .groupBy(categories.id)
      .orderBy(asc(categories.name));
    return c.json({ items: rows });
  })

  .get("/courses", validate("query", courseListQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const filters: SQL[] = [eq(courses.status, "published")];
    if (query.q) {
      const pattern = likePattern(query.q);
      filters.push(or(ilike(courses.title, pattern), ilike(courses.subtitle, pattern))!);
    }
    if (query.category) filters.push(eq(categories.slug, query.category));
    if (query.level) filters.push(eq(courses.level, query.level));
    if (query.price === "free") filters.push(eq(courses.priceCents, 0));
    if (query.price === "paid") filters.push(gt(courses.priceCents, 0));
    const where = and(...filters);

    const orderBy = {
      popular: [desc(courses.studentsCount), desc(courses.ratingAvg)],
      rating: [desc(courses.ratingAvg), desc(courses.ratingCount)],
      newest: [desc(courses.publishedAt)],
      "price-asc": [asc(courses.priceCents)],
      "price-desc": [desc(courses.priceCents)],
    }[query.sort ?? "popular"];

    const [items, [total]] = await Promise.all([
      courseCardQuery()
        .where(where)
        .orderBy(...orderBy, asc(courses.id))
        .limit(query.pageSize)
        .offset(offsetOf(query.page, query.pageSize)),
      db
        .select({ value: count() })
        .from(courses)
        .leftJoin(categories, eq(categories.id, courses.categoryId))
        .where(where),
    ]);

    return c.json(paginate(items, total?.value ?? 0, query.page, query.pageSize));
  })

  /** Tarjetas de cursos publicados por id (carrito de invitado). */
  .get("/courses/by-ids", validate("query", z.object({ ids: z.string().max(4000) })), async (c) => {
    const ids = c.req
      .valid("query")
      .ids.split(",")
      .filter((id) => z.uuid().safeParse(id).success)
      .slice(0, 100);
    if (!ids.length) return c.json({ items: [] });
    const items = await courseCardQuery().where(and(inArray(courses.id, ids), eq(courses.status, "published")));
    return c.json({ items });
  })

  .get("/courses/:slug", async (c) => {
    const slug = c.req.param("slug");
    const [course] = await db
      .select({
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        subtitle: courses.subtitle,
        description: courses.description,
        learningOutcomes: courses.learningOutcomes,
        requirements: courses.requirements,
        level: courses.level,
        language: courses.language,
        coverImageUrl: courses.coverImageUrl,
        priceCents: courses.priceCents,
        currency: courses.currency,
        ratingAvg: courses.ratingAvg,
        ratingCount: courses.ratingCount,
        studentsCount: courses.studentsCount,
        durationSec: courses.durationSec,
        chaptersCount: courses.chaptersCount,
        publishedAt: courses.publishedAt,
        updatedAt: courses.updatedAt,
        instructor: {
          id: user.id,
          name: user.name,
          image: user.image,
          headline: user.headline,
          bio: user.bio,
        },
        category: { name: categories.name, slug: categories.slug },
      })
      .from(courses)
      .innerJoin(user, eq(user.id, courses.instructorId))
      .leftJoin(categories, eq(categories.id, courses.categoryId))
      .where(and(eq(courses.slug, slug), eq(courses.status, "published")))
      .limit(1);

    if (!course) throw notFound("Curso no encontrado");
    const [sections, [resources]] = await Promise.all([
      loadCurriculum(course.id),
      db
        .select({ value: count() })
        .from(chapterResources)
        .innerJoin(chapters, eq(chapters.id, chapterResources.chapterId))
        .where(eq(chapters.courseId, course.id)),
    ]);
    return c.json({ ...course, sections, resourcesCount: resources?.value ?? 0 });
  })

  .get("/courses/:slug/reviews", validate("query", pageQuerySchema), async (c) => {
    const { page, pageSize } = c.req.valid("query");
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.slug, c.req.param("slug")), eq(courses.status, "published")))
      .limit(1);
    if (!course) throw notFound("Curso no encontrado");

    const visible = and(eq(reviews.courseId, course.id), eq(reviews.hidden, false));
    const [items, [total], distribution] = await Promise.all([
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          body: reviews.body,
          createdAt: reviews.createdAt,
          updatedAt: reviews.updatedAt,
          author: { name: user.name, image: user.image },
        })
        .from(reviews)
        .innerJoin(user, eq(user.id, reviews.userId))
        .where(visible)
        .orderBy(desc(reviews.createdAt))
        .limit(pageSize)
        .offset(offsetOf(page, pageSize)),
      db.select({ value: count() }).from(reviews).where(visible),
      db
        .select({ rating: reviews.rating, count: sql<number>`count(*)::int` })
        .from(reviews)
        .where(visible)
        .groupBy(reviews.rating),
    ]);

    const dist = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: distribution.find((d) => d.rating === stars)?.count ?? 0,
    }));
    return c.json({ ...paginate(items, total?.value ?? 0, page, pageSize), distribution: dist });
  })

  .get("/certificates/:code", async (c) => {
    return c.json(await loadCertificate(c.req.param("code")));
  })

  .get("/certificates/:code/pdf", async (c) => {
    const cert = await loadCertificate(c.req.param("code"));
    const pdf = await renderCertificatePdf({
      studentName: cert.studentName,
      courseTitle: cert.course.title,
      instructorName: cert.instructorName,
      issuedAt: cert.issuedAt,
      code: cert.code,
      verifyUrl: `${env.APP_URL.replace(/^https?:\/\//, "")}/certificados/${cert.code}`,
      durationLabel: formatDuration(cert.course.durationSec),
    });
    return c.body(new Uint8Array(pdf), 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${cert.code}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    });
  });
