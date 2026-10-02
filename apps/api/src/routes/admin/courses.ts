import {
  adminCourseListQuerySchema,
  chapterCreateSchema,
  chapterInputSchema,
  courseInputSchema,
  courseStatusInputSchema,
  curriculumReorderSchema,
  resourceInputSchema,
  sectionInputSchema,
  videoUploadInputSchema,
} from "@academia/shared";
import { type SQL, and, asc, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import {
  categories,
  chapterResources,
  chapters,
  courses,
  enrollments,
  orderItems,
  sections,
  user,
} from "../../db/schema";
import { env } from "../../env";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { TAGS, routeDocs } from "../../lib/openapi";
import { okResponse } from "../../lib/openapi-schemas";
import { likePattern, offsetOf, orderByFrom, paginate } from "../../lib/pagination";
import { deleteObject } from "../../lib/storage";
import {
  createTusUpload,
  deleteVideo,
  enforceVideoSecurity,
  getVideo,
  isStreamConfigured,
  mapVideoState,
} from "../../lib/stream";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../middleware/auth";
import { loadCurriculum } from "../../services/course-queries";
import { recalcCourseContent } from "../../services/course-stats";

async function findCourse(id: string) {
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!course) throw notFound("Curso no encontrado");
  return course;
}

async function findChapter(id: string) {
  const chapter = await db.query.chapters.findFirst({ where: eq(chapters.id, id) });
  if (!chapter) throw notFound("Capítulo no encontrado");
  return chapter;
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const existing = await db.query.courses.findFirst({
    columns: { id: true },
    where: exceptId ? and(eq(courses.slug, slug), ne(courses.id, exceptId)) : eq(courses.slug, slug),
  });
  if (existing) throw conflict("Ya existe un curso con ese slug");
}

async function assertInstructor(instructorId: string) {
  const instructor = await db.query.user.findFirst({
    columns: { role: true },
    where: eq(user.id, instructorId),
  });
  if (!instructor || instructor.role !== "admin") {
    throw badRequest("El instructor debe ser un usuario administrador");
  }
}

async function nextPosition(table: typeof sections | typeof chapters, where: SQL) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${table.position}), -1)::int` })
    .from(table)
    .where(where);
  return (row?.max ?? -1) + 1;
}

const doc = routeDocs(TAGS.adminCourses);
const PUBLISH_RULE = "Para publicar hace falta al menos un capítulo con video listo.";
const TUS_NOTE = "Devuelve la URL tus a la que el navegador sube el archivo directamente.";

export const adminCourseRoutes = new Hono<AppEnv>()
  .get(
    "/courses",
    doc("Listar cursos (todos los estados)"),
    validate("query", adminCourseListQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const filters: SQL[] = [];
      if (query.q) {
        const pattern = likePattern(query.q);
        filters.push(or(ilike(courses.title, pattern), ilike(courses.slug, pattern))!);
      }
      if (query.status) filters.push(eq(courses.status, query.status));
      if (query.categoryId) filters.push(eq(courses.categoryId, query.categoryId));
      const where = filters.length ? and(...filters) : undefined;

      const orderBy = orderByFrom(
        {
          title: courses.title,
          priceCents: courses.priceCents,
          studentsCount: courses.studentsCount,
          status: courses.status,
          updatedAt: courses.updatedAt,
        },
        query.sort,
        query.order,
        desc(courses.updatedAt),
      );

      const [items, [total]] = await Promise.all([
        db
          .select({
            id: courses.id,
            slug: courses.slug,
            title: courses.title,
            status: courses.status,
            priceCents: courses.priceCents,
            currency: courses.currency,
            studentsCount: courses.studentsCount,
            chaptersCount: courses.chaptersCount,
            ratingAvg: courses.ratingAvg,
            coverImageUrl: courses.coverImageUrl,
            updatedAt: courses.updatedAt,
            category: { id: categories.id, name: categories.name },
            instructor: { name: user.name },
          })
          .from(courses)
          .innerJoin(user, eq(user.id, courses.instructorId))
          .leftJoin(categories, eq(categories.id, courses.categoryId))
          .where(where)
          .orderBy(orderBy, asc(courses.id))
          .limit(query.pageSize)
          .offset(offsetOf(query.page, query.pageSize)),
        db.select({ value: count() }).from(courses).where(where),
      ]);
      return c.json(paginate(items, total?.value ?? 0, query.page, query.pageSize));
    },
  )

  /** Opciones para los selects del formulario de curso. */
  .get("/courses/options", doc("Opciones del formulario de curso (categorías, instructores, cursos)"), async (c) => {
    const [categoryRows, instructors, courseRows] = await Promise.all([
      db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
      db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.role, "admin"))
        .orderBy(asc(user.name)),
      db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(asc(courses.title)),
    ]);
    return c.json({ categories: categoryRows, instructors, courses: courseRows, currency: env.CURRENCY });
  })

  .post(
    "/courses",
    doc("Crear un curso", { status: 201, errors: [400, 409] }),
    validate("json", courseInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      await assertSlugFree(input.slug);
      await assertInstructor(input.instructorId);
      const [course] = await db
        .insert(courses)
        .values({ ...input, currency: env.CURRENCY })
        .returning();
      return c.json(course!, 201);
    },
  )

  .get("/courses/:id", doc("Ver un curso con su currículo completo", { errors: [404] }), async (c) => {
    const course = await findCourse(c.req.param("id"));
    const curriculum = await loadCurriculum(course.id, { admin: true, withResources: true });
    return c.json({ ...course, sections: curriculum, streamConfigured: isStreamConfigured() });
  })

  .put(
    "/courses/:id",
    doc("Actualizar un curso", { errors: [400, 404, 409] }),
    validate("json", courseInputSchema),
    async (c) => {
      const course = await findCourse(c.req.param("id"));
      const input = c.req.valid("json");
      if (input.slug !== course.slug) await assertSlugFree(input.slug, course.id);
      if (input.instructorId !== course.instructorId) await assertInstructor(input.instructorId);
      const [updated] = await db.update(courses).set(input).where(eq(courses.id, course.id)).returning();
      return c.json(updated!);
    },
  )

  .patch(
    "/courses/:id/status",
    doc("Cambiar el estado de un curso", { description: PUBLISH_RULE, errors: [400, 404] }),
    validate("json", courseStatusInputSchema),
    async (c) => {
      const course = await findCourse(c.req.param("id"));
      const { status } = c.req.valid("json");
      if (status === "published") {
        const [ready] = await db
          .select({ value: count() })
          .from(chapters)
          .where(and(eq(chapters.courseId, course.id), eq(chapters.videoStatus, "ready")));
        if (!ready?.value) throw badRequest("Para publicar, el curso necesita al menos un capítulo con video listo");
      }
      const [updated] = await db
        .update(courses)
        .set({ status, publishedAt: status === "published" ? (course.publishedAt ?? new Date()) : course.publishedAt })
        .where(eq(courses.id, course.id))
        .returning();
      return c.json(updated!);
    },
  )

  .delete(
    "/courses/:id",
    doc("Borrar un curso sin ventas ni alumnos", { response: okResponse, errors: [404, 409] }),
    async (c) => {
      const course = await findCourse(c.req.param("id"));
      const [[sold], [enrolled]] = await Promise.all([
        db.select({ value: count() }).from(orderItems).where(eq(orderItems.courseId, course.id)),
        db.select({ value: count() }).from(enrollments).where(eq(enrollments.courseId, course.id)),
      ]);
      if (sold?.value || enrolled?.value) {
        throw conflict("El curso tiene ventas o alumnos: archívalo en lugar de borrarlo");
      }
      const chapterRows = await db
        .select({ id: chapters.id, streamUid: chapters.streamUid })
        .from(chapters)
        .where(eq(chapters.courseId, course.id));
      const resourceRows = chapterRows.length
        ? await db
            .select({ fileKey: chapterResources.fileKey })
            .from(chapterResources)
            .where(
              inArray(
                chapterResources.chapterId,
                chapterRows.map((ch) => ch.id),
              ),
            )
        : [];
      await db.delete(courses).where(eq(courses.id, course.id));
      await Promise.all([
        ...chapterRows.filter((ch) => ch.streamUid).map((ch) => deleteVideo(ch.streamUid!)),
        ...resourceRows.map((r) => deleteObject(r.fileKey)),
      ]);
      return c.json({ ok: true });
    },
  )

  /* --------------------------------- Secciones --------------------------------- */

  .post(
    "/courses/:id/sections",
    doc("Crear una sección", { status: 201, errors: [404] }),
    validate("json", sectionInputSchema),
    async (c) => {
      const course = await findCourse(c.req.param("id"));
      const position = await nextPosition(sections, eq(sections.courseId, course.id));
      const [section] = await db
        .insert(sections)
        .values({ courseId: course.id, title: c.req.valid("json").title, position })
        .returning();
      return c.json(section!, 201);
    },
  )

  .patch(
    "/sections/:id",
    doc("Renombrar una sección", { errors: [404] }),
    validate("json", sectionInputSchema),
    async (c) => {
      const [section] = await db
        .update(sections)
        .set({ title: c.req.valid("json").title })
        .where(eq(sections.id, c.req.param("id")))
        .returning();
      if (!section) throw notFound("Sección no encontrada");
      return c.json(section);
    },
  )

  .delete(
    "/sections/:id",
    doc("Borrar una sección y sus capítulos", { response: okResponse, errors: [404] }),
    async (c) => {
      const section = await db.query.sections.findFirst({ where: eq(sections.id, c.req.param("id")) });
      if (!section) throw notFound("Sección no encontrada");
      const chapterRows = await db
        .select({ id: chapters.id, streamUid: chapters.streamUid })
        .from(chapters)
        .where(eq(chapters.sectionId, section.id));
      const resourceRows = chapterRows.length
        ? await db
            .select({ fileKey: chapterResources.fileKey })
            .from(chapterResources)
            .where(
              inArray(
                chapterResources.chapterId,
                chapterRows.map((ch) => ch.id),
              ),
            )
        : [];
      await db.transaction(async (tx) => {
        await tx.delete(sections).where(eq(sections.id, section.id));
        await recalcCourseContent(tx, section.courseId);
      });
      await Promise.all([
        ...chapterRows.filter((ch) => ch.streamUid).map((ch) => deleteVideo(ch.streamUid!)),
        ...resourceRows.map((r) => deleteObject(r.fileKey)),
      ]);
      return c.json({ ok: true });
    },
  )

  /** Reordena secciones y capítulos (los capítulos pueden cambiar de sección). */
  .put(
    "/courses/:id/curriculum",
    doc("Reordenar secciones y capítulos", { response: okResponse, errors: [400, 404] }),
    validate("json", curriculumReorderSchema),
    async (c) => {
      const course = await findCourse(c.req.param("id"));
      const input = c.req.valid("json");

      const [sectionRows, chapterRows] = await Promise.all([
        db.select({ id: sections.id }).from(sections).where(eq(sections.courseId, course.id)),
        db.select({ id: chapters.id }).from(chapters).where(eq(chapters.courseId, course.id)),
      ]);
      const sectionIds = new Set(sectionRows.map((s) => s.id));
      const chapterIds = new Set(chapterRows.map((ch) => ch.id));
      const sentChapters = input.sections.flatMap((s) => s.chapterIds);

      if (
        input.sections.length !== sectionIds.size ||
        input.sections.some((s) => !sectionIds.has(s.id)) ||
        sentChapters.length !== chapterIds.size ||
        sentChapters.some((id) => !chapterIds.has(id))
      ) {
        throw badRequest("El orden enviado no coincide con el currículo actual. Recarga la página.");
      }

      await db.transaction(async (tx) => {
        for (const [sectionIndex, section] of input.sections.entries()) {
          await tx.update(sections).set({ position: sectionIndex }).where(eq(sections.id, section.id));
          for (const [chapterIndex, chapterId] of section.chapterIds.entries()) {
            await tx
              .update(chapters)
              .set({ position: chapterIndex, sectionId: section.id })
              .where(eq(chapters.id, chapterId));
          }
        }
      });
      return c.json({ ok: true });
    },
  )

  /* --------------------------------- Capítulos --------------------------------- */

  .post(
    "/courses/:id/chapters",
    doc("Crear un capítulo", { status: 201, errors: [400, 404] }),
    validate("json", chapterCreateSchema),
    async (c) => {
      const course = await findCourse(c.req.param("id"));
      const input = c.req.valid("json");
      const section = await db.query.sections.findFirst({
        columns: { id: true },
        where: and(eq(sections.id, input.sectionId), eq(sections.courseId, course.id)),
      });
      if (!section) throw badRequest("La sección no pertenece a este curso");
      const position = await nextPosition(chapters, eq(chapters.sectionId, section.id));
      const chapter = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(chapters)
          .values({
            courseId: course.id,
            sectionId: section.id,
            title: input.title,
            description: input.description,
            isFreePreview: input.isFreePreview,
            position,
          })
          .returning();
        await recalcCourseContent(tx, course.id);
        return row!;
      });
      return c.json(chapter, 201);
    },
  )

  .patch(
    "/chapters/:id",
    doc("Actualizar un capítulo", { errors: [404] }),
    validate("json", chapterInputSchema),
    async (c) => {
      const chapter = await findChapter(c.req.param("id"));
      const [updated] = await db
        .update(chapters)
        .set(c.req.valid("json"))
        .where(eq(chapters.id, chapter.id))
        .returning();
      return c.json(updated!);
    },
  )

  .delete("/chapters/:id", doc("Borrar un capítulo", { response: okResponse, errors: [404] }), async (c) => {
    const chapter = await findChapter(c.req.param("id"));
    const resourceRows = await db
      .select({ fileKey: chapterResources.fileKey })
      .from(chapterResources)
      .where(eq(chapterResources.chapterId, chapter.id));
    await db.transaction(async (tx) => {
      await tx.delete(chapters).where(eq(chapters.id, chapter.id));
      await recalcCourseContent(tx, chapter.courseId);
    });
    await Promise.all([
      chapter.streamUid ? deleteVideo(chapter.streamUid) : Promise.resolve(),
      ...resourceRows.map((r) => deleteObject(r.fileKey)),
    ]);
    return c.json({ ok: true });
  })

  /* ----------------------------------- Video ----------------------------------- */

  /** Crea la subida tus en Stream. El navegador sube el archivo directo a Cloudflare. */
  .post(
    "/chapters/:id/video-upload",
    doc("Crear la subida del video en Cloudflare Stream", { description: TUS_NOTE, errors: [404, 503] }),
    validate("json", videoUploadInputSchema),
    async (c) => {
      const chapter = await findChapter(c.req.param("id"));
      const input = c.req.valid("json");
      const upload = await createTusUpload(input);
      const previousUid = chapter.streamUid;

      await db.transaction(async (tx) => {
        await tx
          .update(chapters)
          .set({ streamUid: upload.uid, videoStatus: "uploading", durationSec: 0 })
          .where(eq(chapters.id, chapter.id));
        await recalcCourseContent(tx, chapter.courseId);
      });
      if (previousUid && previousUid !== upload.uid) await deleteVideo(previousUid);

      return c.json({ uploadUrl: upload.uploadUrl, uid: upload.uid });
    },
  )

  /**
   * Consulta el estado del video en Stream. El panel la llama mientras procesa;
   * es el respaldo del webhook (que en local no llega).
   */
  .post(
    "/chapters/:id/video-sync",
    doc("Sincronizar el estado del video con Stream", { errors: [400, 404, 503] }),
    async (c) => {
      const chapter = await findChapter(c.req.param("id"));
      if (!chapter.streamUid) throw badRequest("El capítulo no tiene video");
      const video = await getVideo(chapter.streamUid);
      const status = mapVideoState(video);
      if (status === "ready" && !video.requireSignedURLs) await enforceVideoSecurity(video.uid);
      const durationSec = video.duration > 0 ? Math.round(video.duration) : 0;
      const [updated] = await db.transaction(async (tx) => {
        const rows = await tx
          .update(chapters)
          .set({ videoStatus: status, durationSec })
          .where(eq(chapters.id, chapter.id))
          .returning({ id: chapters.id, videoStatus: chapters.videoStatus, durationSec: chapters.durationSec });
        await recalcCourseContent(tx, chapter.courseId);
        return rows;
      });
      return c.json({ ...updated!, errorReason: video.status.errorReasonText ?? null });
    },
  )

  .delete(
    "/chapters/:id/video",
    doc("Quitar el video de un capítulo", { response: okResponse, errors: [404] }),
    async (c) => {
      const chapter = await findChapter(c.req.param("id"));
      await db.transaction(async (tx) => {
        await tx
          .update(chapters)
          .set({ streamUid: null, videoStatus: "none", durationSec: 0 })
          .where(eq(chapters.id, chapter.id));
        await recalcCourseContent(tx, chapter.courseId);
      });
      if (chapter.streamUid) await deleteVideo(chapter.streamUid);
      return c.json({ ok: true });
    },
  )

  /* --------------------------------- Recursos --------------------------------- */

  .post(
    "/chapters/:id/resources",
    doc("Adjuntar un recurso a un capítulo", { status: 201, errors: [400, 404] }),
    validate("json", resourceInputSchema),
    async (c) => {
      const chapter = await findChapter(c.req.param("id"));
      const input = c.req.valid("json");
      if (!input.fileKey.startsWith("resources/")) throw badRequest("Archivo no válido");
      const [resource] = await db
        .insert(chapterResources)
        .values({ ...input, chapterId: chapter.id })
        .returning();
      return c.json(resource!, 201);
    },
  )

  .delete("/resources/:id", doc("Borrar un recurso", { response: okResponse, errors: [404] }), async (c) => {
    const [resource] = await db
      .delete(chapterResources)
      .where(eq(chapterResources.id, c.req.param("id")))
      .returning();
    if (!resource) throw notFound("Recurso no encontrado");
    await deleteObject(resource.fileKey);
    return c.json({ ok: true });
  });
