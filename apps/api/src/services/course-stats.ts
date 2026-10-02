import { and, eq, isNull, sql } from "drizzle-orm";
import type { DbOrTx } from "../db";
import { chapters, courses, enrollments, reviews } from "../db/schema";

/** Duración total y número de capítulos (solo cuentan los que tienen video listo). */
export async function recalcCourseContent(tx: DbOrTx, courseId: string) {
  // Alias explícitos: dentro de un UPDATE Drizzle no cualifica las columnas de la subconsulta.
  await tx
    .update(courses)
    .set({
      durationSec: sql`(select coalesce(sum(ch.duration_sec), 0) from chapters ch where ch.course_id = ${courseId} and ch.video_status = 'ready')`,
      chaptersCount: sql`(select count(*) from chapters ch where ch.course_id = ${courseId})`,
    })
    .where(eq(courses.id, courseId));
}

export async function recalcCourseRating(tx: DbOrTx, courseId: string) {
  const [row] = await tx
    .select({
      avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::real`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(and(eq(reviews.courseId, courseId), eq(reviews.hidden, false)));
  await tx
    .update(courses)
    .set({ ratingAvg: row?.avg ?? 0, ratingCount: row?.count ?? 0 })
    .where(eq(courses.id, courseId));
}

export async function recalcCourseStudents(tx: DbOrTx, courseId: string) {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), isNull(enrollments.revokedAt)));
  await tx
    .update(courses)
    .set({ studentsCount: row?.count ?? 0 })
    .where(eq(courses.id, courseId));
}
