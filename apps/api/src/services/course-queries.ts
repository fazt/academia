import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { categories, chapterResources, chapters, courses, sections, user } from "../db/schema";

/** Columnas públicas de una tarjeta de curso (nunca incluye ids internos de terceros). */
export const courseCardColumns = {
  id: courses.id,
  slug: courses.slug,
  title: courses.title,
  subtitle: courses.subtitle,
  coverImageUrl: courses.coverImageUrl,
  priceCents: courses.priceCents,
  currency: courses.currency,
  level: courses.level,
  ratingAvg: courses.ratingAvg,
  ratingCount: courses.ratingCount,
  studentsCount: courses.studentsCount,
  durationSec: courses.durationSec,
  chaptersCount: courses.chaptersCount,
  publishedAt: courses.publishedAt,
  instructor: { id: user.id, name: user.name },
  category: { name: categories.name, slug: categories.slug },
};

export function courseCardQuery() {
  return db
    .select(courseCardColumns)
    .from(courses)
    .innerJoin(user, eq(user.id, courses.instructorId))
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .$dynamic();
}

export type CourseCard = Awaited<ReturnType<ReturnType<typeof courseCardQuery>["execute"]>>[number];

/**
 * Currículo (secciones -> capítulos). `includePrivate` añade los datos que solo
 * deben ver los admins (uid de Stream) o los alumnos inscritos (recursos).
 */
export async function loadCurriculum(courseId: string, opts: { admin?: boolean; withResources?: boolean } = {}) {
  const sectionRows = await db
    .select({ id: sections.id, title: sections.title, position: sections.position })
    .from(sections)
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.position), asc(sections.createdAt));

  const chapterRows = await db
    .select({
      id: chapters.id,
      sectionId: chapters.sectionId,
      title: chapters.title,
      description: chapters.description,
      position: chapters.position,
      isFreePreview: chapters.isFreePreview,
      videoStatus: chapters.videoStatus,
      durationSec: chapters.durationSec,
      streamUid: chapters.streamUid,
    })
    .from(chapters)
    .where(eq(chapters.courseId, courseId))
    .orderBy(asc(chapters.position), asc(chapters.createdAt));

  const resourceRows =
    opts.withResources && chapterRows.length
      ? await db
          .select({
            id: chapterResources.id,
            chapterId: chapterResources.chapterId,
            name: chapterResources.name,
            sizeBytes: chapterResources.sizeBytes,
            mimeType: chapterResources.mimeType,
            fileKey: chapterResources.fileKey,
          })
          .from(chapterResources)
          .where(
            inArray(
              chapterResources.chapterId,
              chapterRows.map((c) => c.id),
            ),
          )
          .orderBy(asc(chapterResources.createdAt))
      : [];

  return sectionRows.map((section) => ({
    id: section.id,
    title: section.title,
    chapters: chapterRows
      .filter((ch) => ch.sectionId === section.id)
      .map((ch) => ({
        id: ch.id,
        title: ch.title,
        description: ch.description,
        isFreePreview: ch.isFreePreview,
        videoStatus: ch.videoStatus,
        durationSec: ch.durationSec,
        hasVideo: ch.videoStatus === "ready",
        streamUid: opts.admin ? ch.streamUid : null,
        resources: resourceRows
          .filter((r) => r.chapterId === ch.id)
          .map((r) => ({
            id: r.id,
            name: r.name,
            sizeBytes: r.sizeBytes,
            mimeType: r.mimeType,
            fileKey: opts.admin ? r.fileKey : null,
          })),
      })),
  }));
}

export type Curriculum = Awaited<ReturnType<typeof loadCurriculum>>;

/** Curso publicado por slug, o null. */
export async function findPublishedCourseBySlug(slug: string) {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.slug, slug), eq(courses.status, "published")))
    .limit(1);
  return course ?? null;
}
