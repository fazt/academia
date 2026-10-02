import { avatarInputSchema, presignInputSchema, profileInputSchema } from "@academia/shared";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import {
  cartItems,
  certificates,
  chapterProgress,
  courses,
  enrollments,
  orderItems,
  orders,
  reviews,
  user,
} from "../db/schema";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { presignUpload, publicUrl } from "../lib/storage";
import { validate } from "../lib/validate";
import { type AppEnv, currentUser, isAdmin, requireAuth } from "../middleware/auth";
import { hasActiveEnrollment } from "../services/access";
import { courseCardQuery, loadCurriculum } from "../services/course-queries";
import { courseProgress, lastWatchedChapterId } from "../services/progress";

const profileColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  image: user.image,
  role: user.role,
  headline: user.headline,
  bio: user.bio,
  createdAt: user.createdAt,
};

export const meRoutes = new Hono<AppEnv>()
  .use(requireAuth)

  .get("/", async (c) => {
    const me = currentUser(c);
    const [profile] = await db.select(profileColumns).from(user).where(eq(user.id, me.id));
    if (!profile) throw notFound();
    return c.json(profile);
  })

  .patch("/", validate("json", profileInputSchema), async (c) => {
    const me = currentUser(c);
    const [profile] = await db
      .update(user)
      .set(c.req.valid("json"))
      .where(eq(user.id, me.id))
      .returning(profileColumns);
    return c.json(profile!);
  })

  .post("/avatar-upload", validate("json", presignInputSchema), async (c) => {
    const me = currentUser(c);
    const input = c.req.valid("json");
    if (input.kind !== "avatar") throw badRequest("Tipo de subida no permitido");
    return c.json(await presignUpload(input, me.id));
  })

  .put("/avatar", validate("json", avatarInputSchema), async (c) => {
    const me = currentUser(c);
    const { image } = c.req.valid("json");
    // Solo se aceptan avatares subidos a nuestro bucket, en la carpeta del propio usuario.
    if (image && !image.startsWith(publicUrl(`avatars/${me.id}/`))) {
      throw badRequest("La imagen debe subirse desde la plataforma");
    }
    const [profile] = await db
      .update(user)
      .set({ image })
      .where(eq(user.id, me.id))
      .returning(profileColumns);
    return c.json(profile!);
  })

  /** Ids de cursos inscritos y en el carrito: personaliza las páginas públicas en el cliente. */
  .get("/library", async (c) => {
    const me = currentUser(c);
    const [owned, cart] = await Promise.all([
      db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(and(eq(enrollments.userId, me.id), isNull(enrollments.revokedAt))),
      db.select({ courseId: cartItems.courseId }).from(cartItems).where(eq(cartItems.userId, me.id)),
    ]);
    return c.json({
      enrolledCourseIds: owned.map((r) => r.courseId),
      cartCourseIds: cart.map((r) => r.courseId),
    });
  })

  .get("/courses", async (c) => {
    const me = currentUser(c);
    const rows = await db
      .select({ courseId: enrollments.courseId, enrolledAt: enrollments.createdAt })
      .from(enrollments)
      .where(and(eq(enrollments.userId, me.id), isNull(enrollments.revokedAt)))
      .orderBy(desc(enrollments.createdAt));
    if (!rows.length) return c.json({ items: [] });

    const ids = rows.map((r) => r.courseId);
    const [cards, certs] = await Promise.all([
      courseCardQuery().where(inArray(courses.id, ids)),
      db
        .select({ courseId: certificates.courseId, code: certificates.code })
        .from(certificates)
        .where(and(eq(certificates.userId, me.id), inArray(certificates.courseId, ids))),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => {
        const card = cards.find((c) => c.id === row.courseId);
        if (!card) return null;
        const [progress, lastChapterId] = await Promise.all([
          courseProgress(me.id, row.courseId),
          lastWatchedChapterId(me.id, row.courseId),
        ]);
        return {
          ...card,
          enrolledAt: row.enrolledAt,
          progress,
          lastChapterId,
          certificateCode: certs.find((x) => x.courseId === row.courseId)?.code ?? null,
        };
      }),
    );
    return c.json({ items: items.filter((i) => i !== null) });
  })

  .get("/courses/:slug/learn", async (c) => {
    const me = currentUser(c);
    const course = await db.query.courses.findFirst({
      columns: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        coverImageUrl: true,
        status: true,
        instructorId: true,
      },
      where: eq(courses.slug, c.req.param("slug")),
    });
    if (!course) throw notFound("Curso no encontrado");
    const enrolled = await hasActiveEnrollment(me.id, course.id);
    if (!isAdmin(me) && !enrolled) {
      throw forbidden("Necesitas estar inscrito en este curso");
    }

    const [sections, progressRows, lastChapterId, progress, cert, myReview, instructor] = await Promise.all([
      loadCurriculum(course.id, { withResources: true }),
      db
        .select({
          chapterId: chapterProgress.chapterId,
          positionSec: chapterProgress.positionSec,
          completedAt: chapterProgress.completedAt,
        })
        .from(chapterProgress)
        .where(and(eq(chapterProgress.userId, me.id), eq(chapterProgress.courseId, course.id))),
      lastWatchedChapterId(me.id, course.id),
      courseProgress(me.id, course.id),
      db.query.certificates.findFirst({
        columns: { code: true },
        where: and(eq(certificates.userId, me.id), eq(certificates.courseId, course.id)),
      }),
      db.query.reviews.findFirst({
        columns: { rating: true, body: true, updatedAt: true },
        where: and(eq(reviews.userId, me.id), eq(reviews.courseId, course.id)),
      }),
      db.query.user.findFirst({
        columns: { id: true, name: true, image: true, headline: true },
        where: eq(user.id, course.instructorId),
      }),
    ]);

    return c.json({
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        coverImageUrl: course.coverImageUrl,
        status: course.status,
      },
      instructor: instructor ?? null,
      sections,
      progress: Object.fromEntries(
        progressRows.map((p) => [p.chapterId, { positionSec: p.positionSec, completed: !!p.completedAt }]),
      ) as Record<string, { positionSec: number; completed: boolean }>,
      summary: progress,
      lastChapterId,
      certificateCode: cert?.code ?? null,
      myReview: myReview ?? null,
      isAdmin: isAdmin(me),
      enrolled,
    });
  })

  .get("/orders", async (c) => {
    const me = currentUser(c);
    const rows = await db
      .select({
        id: orders.id,
        status: orders.status,
        currency: orders.currency,
        subtotalCents: orders.subtotalCents,
        discountCents: orders.discountCents,
        totalCents: orders.totalCents,
        amountPaidCents: orders.amountPaidCents,
        couponCode: orders.couponCode,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
      })
      .from(orders)
      .where(eq(orders.userId, me.id))
      .orderBy(desc(orders.createdAt))
      .limit(100);
    const items = rows.length
      ? await db
          .select({
            orderId: orderItems.orderId,
            courseId: orderItems.courseId,
            courseTitle: orderItems.courseTitle,
            priceCents: orderItems.priceCents,
            discountCents: orderItems.discountCents,
            slug: courses.slug,
          })
          .from(orderItems)
          .innerJoin(courses, eq(courses.id, orderItems.courseId))
          .where(
            inArray(
              orderItems.orderId,
              rows.map((r) => r.id),
            ),
          )
      : [];
    return c.json({
      items: rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) })),
    });
  })

  .get("/orders/by-session/:sessionId", async (c) => {
    const me = currentUser(c);
    const order = await db.query.orders.findFirst({
      columns: { id: true, status: true, totalCents: true, currency: true },
      where: and(eq(orders.stripeCheckoutSessionId, c.req.param("sessionId")), eq(orders.userId, me.id)),
    });
    if (!order) throw notFound("Pedido no encontrado");
    const items = await db
      .select({ courseId: orderItems.courseId, title: orderItems.courseTitle, slug: courses.slug })
      .from(orderItems)
      .innerJoin(courses, eq(courses.id, orderItems.courseId))
      .where(eq(orderItems.orderId, order.id));
    return c.json({ ...order, items });
  })

  .get("/certificates", async (c) => {
    const me = currentUser(c);
    const rows = await db
      .select({
        code: certificates.code,
        issuedAt: certificates.issuedAt,
        course: { id: courses.id, title: courses.title, slug: courses.slug, coverImageUrl: courses.coverImageUrl },
      })
      .from(certificates)
      .innerJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.userId, me.id))
      .orderBy(desc(certificates.issuedAt));
    return c.json({ items: rows });
  });
