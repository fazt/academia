import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { chapters, courses, enrollments } from "../db/schema";
import type { AuthUser } from "../lib/auth";
import { forbidden, notFound } from "../lib/errors";
import { isAdmin } from "../middleware/auth";

export async function hasActiveEnrollment(userId: string, courseId: string): Promise<boolean> {
  const row = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: and(
      eq(enrollments.userId, userId),
      eq(enrollments.courseId, courseId),
      isNull(enrollments.revokedAt),
    ),
  });
  return !!row;
}

/** Lanza 403 si el usuario no está matriculado (los admins siempre pasan). */
export async function assertCourseAccess(user: AuthUser, courseId: string) {
  if (isAdmin(user)) return;
  if (!(await hasActiveEnrollment(user.id, courseId))) {
    throw forbidden("Necesitas estar inscrito en este curso");
  }
}

/** Carga un capítulo junto al estado de su curso. */
export async function loadChapter(chapterId: string) {
  const [row] = await db
    .select({
      id: chapters.id,
      courseId: chapters.courseId,
      title: chapters.title,
      isFreePreview: chapters.isFreePreview,
      streamUid: chapters.streamUid,
      videoStatus: chapters.videoStatus,
      durationSec: chapters.durationSec,
      courseStatus: courses.status,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(chapters)
    .innerJoin(courses, eq(courses.id, chapters.courseId))
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!row) throw notFound("Capítulo no encontrado");
  return row;
}

export type LoadedChapter = Awaited<ReturnType<typeof loadChapter>>;

/**
 * ¿Puede este usuario ver el video del capítulo?
 * - admin: siempre
 * - preview gratuito de un curso publicado: cualquiera
 * - si no: matrícula activa (se conserva aunque el curso se archive)
 */
export async function canWatchChapter(user: AuthUser | null, chapter: LoadedChapter) {
  if (isAdmin(user)) return true;
  if (chapter.isFreePreview && chapter.courseStatus === "published") return true;
  if (!user) return false;
  return hasActiveEnrollment(user.id, chapter.courseId);
}
