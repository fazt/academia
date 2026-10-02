import { and, count, countDistinct, desc, eq, exists, gte, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { db } from "../../db";
import { chapterComments, courses, enrollments, orderItems, orders, user } from "../../db/schema";
import { env } from "../../env";
import type { AppEnv } from "../../middleware/auth";

const replies = alias(chapterComments, "replies");
const replyAuthor = alias(user, "reply_author");

export const adminStatsRoutes = new Hono<AppEnv>().get("/stats", async (c) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const paid = eq(orders.status, "paid");
  const revenue = sql<number>`coalesce(sum(coalesce(${orders.amountPaidCents}, ${orders.totalCents})), 0)::int`;

  const [
    [allTime],
    [last30],
    [students],
    [published],
    [unanswered],
    daily,
    topCourses,
    recentOrders,
  ] = await Promise.all([
    db.select({ revenueCents: revenue, sales: count() }).from(orders).where(paid),
    db
      .select({ revenueCents: revenue, sales: count() })
      .from(orders)
      .where(and(paid, gte(orders.paidAt, since))),
    db
      .select({ value: countDistinct(enrollments.userId) })
      .from(enrollments)
      .where(isNull(enrollments.revokedAt)),
    db.select({ value: count() }).from(courses).where(eq(courses.status, "published")),
    db
      .select({ value: count() })
      .from(chapterComments)
      .where(
        and(
          isNull(chapterComments.parentId),
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
        ),
      ),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${orders.paidAt}), 'YYYY-MM-DD')`,
        revenueCents: revenue,
        sales: count(),
      })
      .from(orders)
      .where(and(paid, gte(orders.paidAt, since)))
      .groupBy(sql`date_trunc('day', ${orders.paidAt})`)
      .orderBy(sql`date_trunc('day', ${orders.paidAt})`),
    db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        sales: count(orderItems.id),
        revenueCents: sql<number>`coalesce(sum(${orderItems.priceCents} - ${orderItems.discountCents}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, and(eq(orders.id, orderItems.orderId), paid))
      .innerJoin(courses, eq(courses.id, orderItems.courseId))
      .groupBy(courses.id)
      .orderBy(desc(sql`count(${orderItems.id})`))
      .limit(5),
    db
      .select({
        id: orders.id,
        totalCents: orders.totalCents,
        currency: orders.currency,
        status: orders.status,
        createdAt: orders.createdAt,
        user: { name: user.name, email: user.email },
      })
      .from(orders)
      .innerJoin(user, eq(user.id, orders.userId))
      .orderBy(desc(orders.createdAt))
      .limit(6),
  ]);

  // Serie completa de 30 días (con ceros) para el gráfico.
  const series = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const row = daily.find((d) => d.day === key);
    return { day: key, revenueCents: row?.revenueCents ?? 0, sales: row?.sales ?? 0 };
  });

  return c.json({
    currency: env.CURRENCY,
    revenueCents: allTime?.revenueCents ?? 0,
    sales: allTime?.sales ?? 0,
    revenue30Cents: last30?.revenueCents ?? 0,
    sales30: last30?.sales ?? 0,
    students: students?.value ?? 0,
    publishedCourses: published?.value ?? 0,
    unansweredQuestions: unanswered?.value ?? 0,
    series,
    topCourses,
    recentOrders,
  });
});
