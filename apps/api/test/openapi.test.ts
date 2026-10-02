import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import app from "../src/app";
import { db, sqlClient } from "../src/db";
import { categories, certificates, chapters, courses, reviews, sections, user } from "../src/db/schema";
import {
  categoriesResponse,
  certificateResponse,
  courseCardsResponse,
  courseDetailResponse,
  courseListResponse,
  courseReviewsResponse,
  featuredReviewsResponse,
  publicStatsResponse,
} from "../src/lib/openapi-schemas";

// Los esquemas de respuesta de la spec se escriben a mano: este test comprueba que
// siguen describiendo lo que devuelven de verdad los endpoints públicos.

let courseId: string;

beforeAll(async () => {
  await db.execute(sql`
    truncate table stripe_events, certificates, chapter_comments, reviews, chapter_progress, cart_items,
      enrollments, order_items, orders, coupon_courses, coupons, chapter_resources, chapters, sections,
      courses, categories, verification, account, session, "user" restart identity cascade
  `);
  await db.insert(user).values([
    { id: "instructor", name: "Instructora", email: "instructora@test.dev", role: "admin" },
    { id: "alumno", name: "Alumno", email: "alumno-doc@test.dev" },
  ]);
  const [category] = await db.insert(categories).values({ name: "Backend", slug: "backend" }).returning();
  const [course] = await db
    .insert(courses)
    .values({
      slug: "curso-doc",
      title: "Curso documentado",
      instructorId: "instructor",
      categoryId: category!.id,
      priceCents: 1999,
      status: "published",
      publishedAt: new Date(),
    })
    .returning();
  courseId = course!.id;
  const [section] = await db.insert(sections).values({ courseId, title: "Intro", position: 0 }).returning();
  await db.insert(chapters).values({
    courseId,
    sectionId: section!.id,
    title: "Bienvenida",
    isFreePreview: true,
    videoStatus: "ready",
    streamUid: "uid-doc",
    durationSec: 120,
  });
  await db.insert(reviews).values({ userId: "alumno", courseId, rating: 5, body: "Muy claro" });
  await db.insert(certificates).values({ code: "DOCTE-23456", userId: "alumno", courseId });
});

afterAll(async () => {
  await sqlClient.end();
});

async function expectShape(path: string, schema: ZodType) {
  const res = await app.request(`/api${path}`);
  expect(res.status).toBe(200);
  const result = schema.safeParse(await res.json());
  expect(result.error?.issues ?? []).toEqual([]);
}

describe("esquemas de respuesta de la documentación", () => {
  it("cuadran con las respuestas reales del catálogo público", async () => {
    await expectShape("/stats", publicStatsResponse);
    await expectShape("/reviews/featured", featuredReviewsResponse);
    await expectShape("/categories", categoriesResponse);
    await expectShape("/courses", courseListResponse);
    await expectShape(`/courses/by-ids?ids=${courseId}`, courseCardsResponse);
    await expectShape("/courses/curso-doc", courseDetailResponse);
    await expectShape("/courses/curso-doc/reviews", courseReviewsResponse);
    await expectShape("/certificates/DOCTE-23456", certificateResponse);
  });
});
