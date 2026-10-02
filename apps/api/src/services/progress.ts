import { randomInt } from "node:crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../db";
import { certificates, chapterProgress, chapters, courses, user as userTable } from "../db/schema";
import { emails, sendEmail } from "../lib/email";

/** Fracción del video que hay que alcanzar para completar un capítulo. */
export const COMPLETION_RATIO = 0.9;
/** Fracción mínima de la duración que debe pasar en tiempo real desde la primera visita. */
export const MIN_WALL_CLOCK_RATIO = 0.5;

/**
 * Regla de completado decidida en el servidor, para que no se pueda falsificar
 * llamando a la API directamente: hay que llegar al 90 % (o al final) y debe haber
 * pasado al menos la mitad de la duración real desde la primera visita (admite 2x).
 */
export function isChapterComplete(input: {
  durationSec: number;
  maxPositionSec: number;
  ended: boolean;
  firstSeenAt: Date;
  now: Date;
}): boolean {
  if (input.durationSec <= 0) return false;
  const reached = input.ended || input.maxPositionSec >= input.durationSec * COMPLETION_RATIO;
  const elapsedSec = (input.now.getTime() - input.firstSeenAt.getTime()) / 1000;
  return reached && elapsedSec >= input.durationSec * MIN_WALL_CLOCK_RATIO;
}

export async function recordProgress(input: {
  userId: string;
  chapter: { id: string; courseId: string; durationSec: number; videoStatus: string };
  positionSec: number;
  ended: boolean;
}) {
  const { userId, chapter } = input;
  const now = new Date();
  const duration = chapter.durationSec;
  const position = Math.min(Math.round(input.positionSec), duration > 0 ? duration : Math.round(input.positionSec));

  const [row] = await db
    .insert(chapterProgress)
    .values({
      userId,
      chapterId: chapter.id,
      courseId: chapter.courseId,
      positionSec: position,
      maxPositionSec: position,
    })
    .onConflictDoUpdate({
      target: [chapterProgress.userId, chapterProgress.chapterId],
      set: {
        positionSec: position,
        maxPositionSec: sql`greatest(${chapterProgress.maxPositionSec}, ${position})`,
        updatedAt: now,
      },
    })
    .returning();

  if (!row) throw new Error("No se pudo guardar el progreso");

  let justCompleted = false;
  if (
    !row.completedAt &&
    chapter.videoStatus === "ready" &&
    isChapterComplete({
      durationSec: duration,
      maxPositionSec: row.maxPositionSec,
      ended: input.ended,
      firstSeenAt: row.firstSeenAt,
      now,
    })
  ) {
    await db
      .update(chapterProgress)
      .set({ completedAt: now })
      .where(and(eq(chapterProgress.userId, userId), eq(chapterProgress.chapterId, chapter.id)));
    justCompleted = true;
  }

  const certificateCode = justCompleted ? await maybeIssueCertificate(userId, chapter.courseId) : null;

  return {
    positionSec: row.positionSec,
    completed: justCompleted || !!row.completedAt,
    justCompleted,
    certificateCode,
  };
}

/** Porcentaje de avance: capítulos con video listo completados / capítulos con video listo. */
export async function courseProgress(userId: string, courseId: string) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(${chapterProgress.completedAt})::int`,
    })
    .from(chapters)
    .leftJoin(
      chapterProgress,
      and(eq(chapterProgress.chapterId, chapters.id), eq(chapterProgress.userId, userId)),
    )
    .where(and(eq(chapters.courseId, courseId), eq(chapters.videoStatus, "ready")));
  const total = row?.total ?? 0;
  const done = row?.done ?? 0;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCertificateCode() {
  const chars = Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]);
  return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
}

/** Emite el certificado si el curso está completo. Idempotente. */
export async function maybeIssueCertificate(userId: string, courseId: string): Promise<string | null> {
  const progress = await courseProgress(userId, courseId);
  if (progress.total === 0 || progress.done < progress.total) return null;

  const [inserted] = await db
    .insert(certificates)
    .values({ userId, courseId, code: generateCertificateCode() })
    .onConflictDoNothing({ target: [certificates.userId, certificates.courseId] })
    .returning({ code: certificates.code });

  if (!inserted) {
    const existing = await db.query.certificates.findFirst({
      columns: { code: true },
      where: and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)),
    });
    return existing?.code ?? null;
  }

  const [info] = await db
    .select({ name: userTable.name, email: userTable.email, courseTitle: courses.title })
    .from(userTable)
    .innerJoin(courses, eq(courses.id, courseId))
    .where(eq(userTable.id, userId))
    .limit(1);
  if (info) {
    await sendEmail({ to: info.email, ...emails.certificateIssued(info.name, info.courseTitle, inserted.code) });
  }
  return inserted.code;
}

/** Último capítulo visto (para "Continuar"). */
export async function lastWatchedChapterId(userId: string, courseId: string) {
  const row = await db.query.chapterProgress.findFirst({
    columns: { chapterId: true },
    where: and(
      eq(chapterProgress.userId, userId),
      eq(chapterProgress.courseId, courseId),
      isNotNull(chapterProgress.updatedAt),
    ),
    orderBy: (p, { desc }) => [desc(p.updatedAt)],
  });
  return row?.chapterId ?? null;
}
