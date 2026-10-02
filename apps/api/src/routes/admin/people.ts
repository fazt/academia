import {
  adminCommentListQuerySchema,
  adminOrderListQuerySchema,
  adminReviewListQuerySchema,
  adminUserListQuerySchema,
  cartAddSchema,
  userRoleInputSchema,
} from "@academia/shared";
import { type SQL, and, count, desc, eq, exists, ilike, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import {
  chapterComments,
  chapters,
  courses,
  enrollments,
  orderItems,
  orders,
  reviews,
  user,
} from "../../db/schema";
import { badRequest, notFound } from "../../lib/errors";
import { likePattern, offsetOf, orderByFrom, paginate } from "../../lib/pagination";
import { stripe } from "../../lib/stripe";
import { validate } from "../../lib/validate";
import { type AppEnv, currentUser } from "../../middleware/auth";
import { recalcCourseRating, recalcCourseStudents } from "../../services/course-stats";
import { enrollFree, revokeOrder } from "../../services/orders";

const replies = alias(chapterComments, "replies");
const replyAuthor = alias(user, "reply_author");

export const adminPeopleRoutes = new Hono<AppEnv>()
  /* --------------------------------- Usuarios --------------------------------- */

  .get("/users", validate("query", adminUserListQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const filters: SQL[] = [];
    if (query.q) {
      const pattern = likePattern(query.q);
      filters.push(or(ilike(user.name, pattern), ilike(user.email, pattern))!);
    }
    if (query.role) filters.push(eq(user.role, query.role));
    if (query.email) filters.push(ilike(user.email, likePattern(query.email)));
    if (query.name) filters.push(ilike(user.name, likePattern(query.name)));
    const where = filters.length ? and(...filters) : undefined;
    const orderBy = orderByFrom(
      { name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
      query.sort,
      query.order,
      desc(user.createdAt),
    );
    const [items, [total]] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          // SQL explícito: en un select de una sola tabla Drizzle no cualifica las columnas.
          coursesCount: sql<number>`(select count(*)::int from enrollments e where e.user_id = "user"."id" and e.revoked_at is null)`,
        })
        .from(user)
        .where(where)
        .orderBy(orderBy)
        .limit(query.pageSize)
        .offset(offsetOf(query.page, query.pageSize)),
      db.select({ value: count() }).from(user).where(where),
    ]);
    return c.json(paginate(items, total?.value ?? 0, query.page, query.pageSize));
  })

  .get("/users/:id", async (c) => {
    const profile = await db.query.user.findFirst({
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        headline: true,
        bio: true,
        emailVerified: true,
        createdAt: true,
      },
      where: eq(user.id, c.req.param("id")),
    });
    if (!profile) throw notFound("Usuario no encontrado");
    const [enrolled, userOrders] = await Promise.all([
      db
        .select({
          courseId: courses.id,
          title: courses.title,
          slug: courses.slug,
          enrolledAt: enrollments.createdAt,
          orderId: enrollments.orderId,
        })
        .from(enrollments)
        .innerJoin(courses, eq(courses.id, enrollments.courseId))
        .where(and(eq(enrollments.userId, profile.id), isNull(enrollments.revokedAt)))
        .orderBy(desc(enrollments.createdAt)),
      db
        .select({
          id: orders.id,
          status: orders.status,
          totalCents: orders.totalCents,
          currency: orders.currency,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.userId, profile.id))
        .orderBy(desc(orders.createdAt))
        .limit(50),
    ]);
    return c.json({ ...profile, enrollments: enrolled, orders: userOrders });
  })

  .patch("/users/:id/role", validate("json", userRoleInputSchema), async (c) => {
    const me = currentUser(c);
    const id = c.req.param("id");
    const { role } = c.req.valid("json");
    if (id === me.id && role !== "admin") throw badRequest("No puedes quitarte el rol de administrador");
    if (role !== "admin") {
      const [teaching] = await db.select({ value: count() }).from(courses).where(eq(courses.instructorId, id));
      if (teaching?.value) throw badRequest("Es instructor de algún curso: asigna otro instructor antes");
    }
    const [updated] = await db
      .update(user)
      .set({ role })
      .where(eq(user.id, id))
      .returning({ id: user.id, role: user.role });
    if (!updated) throw notFound("Usuario no encontrado");
    return c.json(updated);
  })

  /** Acceso manual a un curso (becas, regalos, soporte). */
  .post("/users/:id/enrollments", validate("json", cartAddSchema), async (c) => {
    const target = await db.query.user.findFirst({ columns: { id: true }, where: eq(user.id, c.req.param("id")) });
    if (!target) throw notFound("Usuario no encontrado");
    const { courseId } = c.req.valid("json");
    const course = await db.query.courses.findFirst({ columns: { id: true }, where: eq(courses.id, courseId) });
    if (!course) throw notFound("Curso no encontrado");
    await enrollFree(target.id, [courseId], null);
    return c.json({ ok: true }, 201);
  })

  .delete("/users/:id/enrollments/:courseId", async (c) => {
    const courseId = c.req.param("courseId");
    await db.transaction(async (tx) => {
      await tx
        .update(enrollments)
        .set({ revokedAt: new Date() })
        .where(and(eq(enrollments.userId, c.req.param("id")), eq(enrollments.courseId, courseId)));
      await recalcCourseStudents(tx, courseId);
    });
    return c.json({ ok: true });
  })

  /* ---------------------------------- Órdenes ---------------------------------- */

  .get("/orders", validate("query", adminOrderListQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const filters: SQL[] = [];
    if (query.q) {
      const pattern = likePattern(query.q);
      filters.push(
        or(ilike(user.email, pattern), ilike(user.name, pattern), sql`${orders.id}::text ilike ${pattern}`)!,
      );
    }
    if (query.status) filters.push(eq(orders.status, query.status));
    if (query.email) filters.push(ilike(user.email, likePattern(query.email)));
    const where = filters.length ? and(...filters) : undefined;
    const orderBy = orderByFrom(
      { createdAt: orders.createdAt, totalCents: orders.totalCents, status: orders.status, email: user.email },
      query.sort,
      query.order,
      desc(orders.createdAt),
    );
    const [items, [total]] = await Promise.all([
      db
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
          user: { id: user.id, name: user.name, email: user.email },
          itemsCount: sql<number>`(select count(*)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
        })
        .from(orders)
        .innerJoin(user, eq(user.id, orders.userId))
        .where(where)
        .orderBy(orderBy)
        .limit(query.pageSize)
        .offset(offsetOf(query.page, query.pageSize)),
      db
        .select({ value: count() })
        .from(orders)
        .innerJoin(user, eq(user.id, orders.userId))
        .where(where),
    ]);
    return c.json(paginate(items, total?.value ?? 0, query.page, query.pageSize));
  })

  .get("/orders/:id", async (c) => {
    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        currency: orders.currency,
        subtotalCents: orders.subtotalCents,
        discountCents: orders.discountCents,
        totalCents: orders.totalCents,
        amountPaidCents: orders.amountPaidCents,
        couponCode: orders.couponCode,
        stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
        stripePaymentIntentId: orders.stripePaymentIntentId,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        refundedAt: orders.refundedAt,
        user: { id: user.id, name: user.name, email: user.email },
      })
      .from(orders)
      .innerJoin(user, eq(user.id, orders.userId))
      .where(eq(orders.id, c.req.param("id")))
      .limit(1);
    if (!order) throw notFound("Orden no encontrada");
    const items = await db
      .select({
        courseId: orderItems.courseId,
        courseTitle: orderItems.courseTitle,
        priceCents: orderItems.priceCents,
        discountCents: orderItems.discountCents,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    return c.json({ ...order, items });
  })

  /** Reembolso completo: Stripe devuelve el dinero y se revoca el acceso. */
  .post("/orders/:id/refund", async (c) => {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, c.req.param("id")) });
    if (!order) throw notFound("Orden no encontrada");
    if (order.status !== "paid") throw badRequest("Solo se pueden reembolsar órdenes pagadas");
    if ((order.amountPaidCents ?? order.totalCents) > 0) {
      if (!order.stripePaymentIntentId) throw badRequest("La orden no tiene un pago de Stripe asociado");
      await stripe().refunds.create({ payment_intent: order.stripePaymentIntentId, reason: "requested_by_customer" });
    }
    await revokeOrder(order.id, "refunded");
    return c.json({ ok: true });
  })

  /* ---------------------------------- Reseñas ---------------------------------- */

  .get("/reviews", validate("query", adminReviewListQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const filters: SQL[] = [];
    if (query.q) {
      const pattern = likePattern(query.q);
      filters.push(or(ilike(reviews.body, pattern), ilike(user.name, pattern), ilike(user.email, pattern))!);
    }
    if (query.courseId) filters.push(eq(reviews.courseId, query.courseId));
    if (query.rating) filters.push(eq(reviews.rating, query.rating));
    if (query.hidden) filters.push(eq(reviews.hidden, query.hidden === "true"));
    const where = filters.length ? and(...filters) : undefined;
    const orderBy = orderByFrom(
      { rating: reviews.rating, createdAt: reviews.createdAt },
      query.sort,
      query.order,
      desc(reviews.createdAt),
    );
    const [items, [total]] = await Promise.all([
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          body: reviews.body,
          hidden: reviews.hidden,
          createdAt: reviews.createdAt,
          user: { id: user.id, name: user.name, email: user.email },
          course: { id: courses.id, title: courses.title, slug: courses.slug },
        })
        .from(reviews)
        .innerJoin(user, eq(user.id, reviews.userId))
        .innerJoin(courses, eq(courses.id, reviews.courseId))
        .where(where)
        .orderBy(orderBy)
        .limit(query.pageSize)
        .offset(offsetOf(query.page, query.pageSize)),
      db
        .select({ value: count() })
        .from(reviews)
        .innerJoin(user, eq(user.id, reviews.userId))
        .where(where),
    ]);
    return c.json(paginate(items, total?.value ?? 0, query.page, query.pageSize));
  })

  .patch("/reviews/:id", validate("json", z.object({ hidden: z.boolean() })), async (c) => {
    const review = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(reviews)
        .set({ hidden: c.req.valid("json").hidden })
        .where(eq(reviews.id, c.req.param("id")))
        .returning();
      if (!row) throw notFound("Reseña no encontrada");
      await recalcCourseRating(tx, row.courseId);
      return row;
    });
    return c.json(review);
  })

  /* --------------------------- Comentarios y preguntas --------------------------- */

  .get("/comments", validate("query", adminCommentListQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const filters: SQL[] = [isNull(chapterComments.parentId)];
    if (query.q) {
      const pattern = likePattern(query.q);
      filters.push(or(ilike(chapterComments.body, pattern), ilike(user.name, pattern))!);
    }
    if (query.courseId) filters.push(eq(chapterComments.courseId, query.courseId));
    if (query.kind) filters.push(eq(chapterComments.kind, query.kind));
    if (query.status === "hidden") filters.push(eq(chapterComments.hidden, true));
    if (query.status === "resolved") filters.push(eq(chapterComments.isResolved, true));
    if (query.status === "unanswered") {
      // Preguntas sin resolver y sin ninguna respuesta de un admin.
      filters.push(
        eq(chapterComments.kind, "question"),
        eq(chapterComments.isResolved, false),
        eq(chapterComments.hidden, false),
        sql`not ${exists(
          db
            .select({ one: sql`1` })
            .from(replies)
            .innerJoin(replyAuthor, eq(replyAuthor.id, replies.userId))
            .where(and(eq(replies.parentId, chapterComments.id), eq(replyAuthor.role, "admin"))),
        )}`,
      );
    }
    const where = and(...filters);
    const [items, [total]] = await Promise.all([
      db
        .select({
          id: chapterComments.id,
          kind: chapterComments.kind,
          body: chapterComments.body,
          isResolved: chapterComments.isResolved,
          hidden: chapterComments.hidden,
          createdAt: chapterComments.createdAt,
          repliesCount: sql<number>`(select count(*)::int from ${chapterComments} r where r.parent_id = ${chapterComments.id})`,
          user: { id: user.id, name: user.name, email: user.email },
          course: { id: courses.id, title: courses.title, slug: courses.slug },
          chapter: { id: chapters.id, title: chapters.title },
        })
        .from(chapterComments)
        .innerJoin(user, eq(user.id, chapterComments.userId))
        .innerJoin(courses, eq(courses.id, chapterComments.courseId))
        .innerJoin(chapters, eq(chapters.id, chapterComments.chapterId))
        .where(where)
        .orderBy(desc(chapterComments.createdAt))
        .limit(query.pageSize)
        .offset(offsetOf(query.page, query.pageSize)),
      db
        .select({ value: count() })
        .from(chapterComments)
        .innerJoin(user, eq(user.id, chapterComments.userId))
        .where(where),
    ]);
    return c.json(paginate(items, total?.value ?? 0, query.page, query.pageSize));
  })

  .patch("/comments/:id", validate("json", z.object({ hidden: z.boolean() })), async (c) => {
    const [comment] = await db
      .update(chapterComments)
      .set({ hidden: c.req.valid("json").hidden })
      .where(eq(chapterComments.id, c.req.param("id")))
      .returning();
    if (!comment) throw notFound("Comentario no encontrado");
    return c.json(comment);
  });
