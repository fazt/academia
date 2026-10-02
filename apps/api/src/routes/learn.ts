import {
  commentInputSchema,
  commentListQuerySchema,
  commentUpdateSchema,
  progressInputSchema,
  reviewInputSchema,
} from "@academia/shared";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { chapterComments, chapterResources, courses, reviews, user } from "../db/schema";
import { env } from "../env";
import { emails, sendEmail } from "../lib/email";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { TAGS, optionalSession, routeDocs } from "../lib/openapi";
import { okResponse } from "../lib/openapi-schemas";
import { presignDownload } from "../lib/storage";
import { signPlaybackToken } from "../lib/stream";
import { validate } from "../lib/validate";
import { type AppEnv, currentUser, isAdmin, requireAuth } from "../middleware/auth";
import { assertCourseAccess, canWatchChapter, hasActiveEnrollment, loadChapter } from "../services/access";
import { recalcCourseRating } from "../services/course-stats";
import { recordProgress } from "../services/progress";

const authorColumns = { id: user.id, name: user.name, image: user.image, role: user.role };

async function loadComment(id: string) {
  const comment = await db.query.chapterComments.findFirst({ where: eq(chapterComments.id, id) });
  if (!comment) throw notFound("Comentario no encontrado");
  return comment;
}

const doc = routeDocs(TAGS.learn);
const PLAYBACK_DOCS = {
  description:
    "Sesión opcional: los capítulos de vista previa de un curso publicado son públicos; el resto exige matrícula activa o rol admin.",
  errors: [403, 404, 503],
  extra: { security: optionalSession },
} as const;

export const learnRoutes = new Hono<AppEnv>()
  /**
   * Token firmado de reproducción. Lo puede pedir cualquiera para un preview
   * gratuito; para el resto hace falta matrícula activa (o ser admin).
   */
  .get("/chapters/:id/playback", doc("Token de reproducción de un capítulo", PLAYBACK_DOCS), async (c) => {
    const chapter = await loadChapter(c.req.param("id"));
    if (!(await canWatchChapter(c.get("user"), chapter))) {
      throw forbidden("Inscríbete en el curso para ver este capítulo");
    }
    if (chapter.videoStatus !== "ready" || !chapter.streamUid) {
      throw notFound("Este capítulo todavía no tiene video");
    }
    // Dura lo que el video más 2 h: no caduca a mitad de una clase larga.
    const expiresIn = chapter.durationSec + 2 * 60 * 60;
    const token = await signPlaybackToken(chapter.streamUid, expiresIn);
    return c.json({
      token,
      customerCode: env.STREAM_CUSTOMER_CODE ?? null,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  })

  .put(
    "/chapters/:id/progress",
    doc("Guardar el progreso de un capítulo", { errors: [403, 404] }),
    requireAuth,
    validate("json", progressInputSchema),
    async (c) => {
      const me = currentUser(c);
      const chapter = await loadChapter(c.req.param("id"));
      const input = c.req.valid("json");
      // Solo cuenta el progreso de quien está inscrito: un admin que revisa un curso sin
      // matrícula puede ver los videos, pero no acumula progreso ni obtiene certificados.
      if (!(await hasActiveEnrollment(me.id, chapter.courseId))) {
        if (!isAdmin(me)) throw forbidden("Necesitas estar inscrito en este curso");
        return c.json({
          positionSec: Math.round(input.positionSec),
          completed: false,
          justCompleted: false,
          certificateCode: null as string | null,
        });
      }
      const result = await recordProgress({
        userId: me.id,
        chapter,
        positionSec: input.positionSec,
        ended: input.ended ?? false,
      });
      return c.json(result);
    },
  )

  .get(
    "/chapters/:id/resources/:resourceId/download",
    doc("Enlace temporal de descarga de un recurso", { errors: [403, 404, 503] }),
    requireAuth,
    async (c) => {
      const me = currentUser(c);
      const chapter = await loadChapter(c.req.param("id"));
      await assertCourseAccess(me, chapter.courseId);
      const resource = await db.query.chapterResources.findFirst({
        where: and(
          eq(chapterResources.id, c.req.param("resourceId")),
          eq(chapterResources.chapterId, chapter.id),
        ),
      });
      if (!resource) throw notFound("Recurso no encontrado");
      return c.json({ url: await presignDownload(resource.fileKey, resource.name) });
    },
  )

  /* ---------------------------- Comentarios y preguntas ---------------------------- */

  .get(
    "/chapters/:id/comments",
    doc("Listar comentarios o preguntas de un capítulo", { errors: [403, 404] }),
    requireAuth,
    validate("query", commentListQuerySchema),
    async (c) => {
      const me = currentUser(c);
      const chapter = await loadChapter(c.req.param("id"));
      await assertCourseAccess(me, chapter.courseId);
      const { kind } = c.req.valid("query");
      const admin = isAdmin(me);

      const visibility = admin ? undefined : eq(chapterComments.hidden, false);
      const roots = await db
        .select({
          id: chapterComments.id,
          body: chapterComments.body,
          kind: chapterComments.kind,
          isResolved: chapterComments.isResolved,
          hidden: chapterComments.hidden,
          createdAt: chapterComments.createdAt,
          updatedAt: chapterComments.updatedAt,
          author: authorColumns,
        })
        .from(chapterComments)
        .innerJoin(user, eq(user.id, chapterComments.userId))
        .where(
          and(
            eq(chapterComments.chapterId, chapter.id),
            eq(chapterComments.kind, kind),
            // Solo raíces: las respuestas se cargan aparte.
            isNull(chapterComments.parentId),
            visibility,
          ),
        )
        .orderBy(desc(chapterComments.createdAt))
        .limit(200);

      const replies = roots.length
        ? await db
            .select({
              id: chapterComments.id,
              parentId: chapterComments.parentId,
              body: chapterComments.body,
              hidden: chapterComments.hidden,
              createdAt: chapterComments.createdAt,
              updatedAt: chapterComments.updatedAt,
              author: authorColumns,
            })
            .from(chapterComments)
            .innerJoin(user, eq(user.id, chapterComments.userId))
            .where(
              and(
                inArray(
                  chapterComments.parentId,
                  roots.map((r) => r.id),
                ),
                visibility,
              ),
            )
            .orderBy(asc(chapterComments.createdAt))
        : [];

      return c.json({
        items: roots.map((root) => ({
          ...root,
          replies: replies.filter((r) => r.parentId === root.id),
        })),
      });
    },
  )

  .post(
    "/chapters/:id/comments",
    doc("Publicar un comentario, pregunta o respuesta", { status: 201, errors: [400, 403, 404] }),
    requireAuth,
    validate("json", commentInputSchema),
    async (c) => {
      const me = currentUser(c);
      const chapter = await loadChapter(c.req.param("id"));
      await assertCourseAccess(me, chapter.courseId);
      const input = c.req.valid("json");

      let parent: Awaited<ReturnType<typeof loadComment>> | null = null;
      if (input.parentId) {
        parent = await loadComment(input.parentId);
        // Un solo nivel de respuestas, siempre dentro del mismo capítulo.
        if (parent.chapterId !== chapter.id || parent.parentId !== null) {
          throw badRequest("Solo se puede responder a un comentario principal de este capítulo");
        }
        if (parent.hidden && !isAdmin(me)) throw notFound("Comentario no encontrado");
      }

      const [created] = await db
        .insert(chapterComments)
        .values({
          chapterId: chapter.id,
          courseId: chapter.courseId,
          userId: me.id,
          parentId: parent?.id ?? null,
          kind: parent?.kind ?? input.kind,
          body: input.body,
        })
        .returning();

      // Aviso al autor de la pregunta cuando responde un instructor.
      if (parent && parent.kind === "question" && isAdmin(me) && parent.userId !== me.id) {
        const author = await db.query.user.findFirst({
          columns: { name: true, email: true },
          where: eq(user.id, parent.userId),
        });
        if (author) {
          const url = `${env.APP_URL}/aprender/${chapter.courseSlug}/${chapter.id}?tab=preguntas#c-${parent.id}`;
          await sendEmail({
            to: author.email,
            ...emails.questionAnswered(author.name, chapter.courseTitle, chapter.title, url),
          });
        }
      }

      return c.json(created!, 201);
    },
  )

  .patch(
    "/comments/:id",
    doc("Editar un comentario propio", { errors: [403, 404] }),
    requireAuth,
    validate("json", commentUpdateSchema),
    async (c) => {
      const me = currentUser(c);
      const comment = await loadComment(c.req.param("id"));
      if (comment.userId !== me.id) throw forbidden("Solo puedes editar tus comentarios");
      // Con la matrícula revocada (p. ej. tras un reembolso) ya no se puede editar.
      await assertCourseAccess(me, comment.courseId);
      const [updated] = await db
        .update(chapterComments)
        .set({ body: c.req.valid("json").body })
        .where(eq(chapterComments.id, comment.id))
        .returning();
      return c.json(updated!);
    },
  )

  .delete(
    "/comments/:id",
    doc("Borrar un comentario (autor o admin)", { response: okResponse, errors: [403, 404] }),
    requireAuth,
    async (c) => {
      const me = currentUser(c);
      const comment = await loadComment(c.req.param("id"));
      if (comment.userId !== me.id && !isAdmin(me)) throw forbidden();
      await db.delete(chapterComments).where(eq(chapterComments.id, comment.id));
      return c.json({ ok: true });
    },
  )

  .post(
    "/comments/:id/resolve",
    doc("Marcar una pregunta como resuelta o pendiente", { errors: [400, 403, 404] }),
    requireAuth,
    validate("json", z.object({ resolved: z.boolean() })),
    async (c) => {
      const me = currentUser(c);
      const comment = await loadComment(c.req.param("id"));
      if (comment.kind !== "question" || comment.parentId !== null) {
        throw badRequest("Solo las preguntas se pueden marcar como resueltas");
      }
      if (comment.userId !== me.id && !isAdmin(me)) throw forbidden();
      const [updated] = await db
        .update(chapterComments)
        .set({ isResolved: c.req.valid("json").resolved })
        .where(eq(chapterComments.id, comment.id))
        .returning();
      return c.json(updated!);
    },
  )

  /* ---------------------------------- Reseñas ---------------------------------- */

  .put(
    "/courses/:id/review",
    doc("Crear o actualizar mi reseña de un curso", { errors: [403, 404] }),
    requireAuth,
    validate("json", reviewInputSchema),
    async (c) => {
      const me = currentUser(c);
      const courseId = c.req.param("id");
      const course = await db.query.courses.findFirst({ columns: { id: true }, where: eq(courses.id, courseId) });
      if (!course) throw notFound("Curso no encontrado");
      // Solo alumnos inscritos: los admins sin matrícula no pueden valorar (inflarían la nota).
      if (!(await hasActiveEnrollment(me.id, courseId))) {
        throw forbidden("Solo los alumnos inscritos pueden dejar una reseña");
      }
      const input = c.req.valid("json");

      const review = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(reviews)
          .values({ userId: me.id, courseId, rating: input.rating, body: input.body })
          .onConflictDoUpdate({
            target: [reviews.userId, reviews.courseId],
            set: { rating: input.rating, body: input.body, updatedAt: new Date() },
          })
          .returning();
        await recalcCourseRating(tx, courseId);
        return row!;
      });
      return c.json(review);
    },
  );
