import { and, eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { db, sqlClient } from "../src/db";
import {
  account,
  chapterComments,
  chapters,
  coupons,
  courses,
  enrollments,
  orderItems,
  reviews,
  orders,
  sections,
  stripeEvents,
  user,
} from "../src/db/schema";
import { auth } from "../src/lib/auth";
import { reserveCouponRedemption } from "../src/services/coupons";

const ORIGIN = "http://localhost:3010";
const PASSWORD = "password123";

// Los emails se imprimen en consola cuando no hay Resend: se silencian en los tests.
vi.spyOn(console, "info").mockImplementation(() => {});

async function createUser(email: string, name: string, role: "student" | "admin" = "student") {
  const { user: created } = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name } });
  if (role === "admin") await db.update(user).set({ role }).where(eq(user.id, created.id));
  return created.id;
}

async function login(email: string) {
  const res = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  expect(res.status).toBe(200);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

function call(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
  return app.request(`/api${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      ...(init.cookie ? { Cookie: init.cookie } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

let adminId: string;
let studentId: string;
let outsiderId: string;
let studentCookie: string;
let outsiderCookie: string;
let adminCookie: string;
let courseId: string;
let previewChapterId: string;
let lockedChapterId: string;

beforeAll(async () => {
  await db.execute(sql`
    truncate table stripe_events, certificates, chapter_comments, reviews, chapter_progress, cart_items,
      enrollments, order_items, orders, coupon_courses, coupons, chapter_resources, chapters, sections,
      courses, categories, verification, account, session, "user" restart identity cascade
  `);

  adminId = await createUser("admin@test.dev", "Admin", "admin");
  studentId = await createUser("alumno@test.dev", "Alumno");
  outsiderId = await createUser("visitante@test.dev", "Visitante");
  studentCookie = await login("alumno@test.dev");
  outsiderCookie = await login("visitante@test.dev");
  adminCookie = await login("admin@test.dev");

  const [course] = await db
    .insert(courses)
    .values({ slug: "curso-test", title: "Curso test", instructorId: adminId, priceCents: 1999, status: "published" })
    .returning();
  courseId = course!.id;
  const [section] = await db.insert(sections).values({ courseId, title: "Intro", position: 0 }).returning();
  const [preview, locked] = await db
    .insert(chapters)
    .values([
      { courseId, sectionId: section!.id, title: "Preview", position: 0, isFreePreview: true, videoStatus: "ready", streamUid: "uid-preview", durationSec: 300 },
      { courseId, sectionId: section!.id, title: "Bloqueado", position: 1, videoStatus: "ready", streamUid: "uid-locked", durationSec: 600 },
    ])
    .returning();
  previewChapterId = preview!.id;
  lockedChapterId = locked!.id;
  await db.insert(enrollments).values({ userId: studentId, courseId });
});

afterAll(async () => {
  await sqlClient.end();
});

describe("seguridad de la cuenta", () => {
  it("un alumno no puede asignarse el rol de admin", async () => {
    const res = await call("/auth/update-user", { method: "POST", body: { role: "admin" }, cookie: outsiderCookie });
    expect(res.status).toBeGreaterThanOrEqual(400);
    const row = await db.query.user.findFirst({ where: eq(user.id, outsiderId) });
    expect(row?.role).toBe("student");
  });

  it("las rutas de admin rechazan a los alumnos", async () => {
    expect((await call("/admin/stats", { cookie: studentCookie })).status).toBe(403);
    expect((await call("/admin/stats")).status).toBe(401);
  });

  it("el detalle público de un curso no expone el uid de Stream", async () => {
    const res = await call("/courses/curso-test");
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("uid-");
  });
});

describe("acceso a la reproducción", () => {
  // Sin signing key configurada, un acceso permitido termina en 503 al firmar el token:
  // eso demuestra que la comprobación de acceso pasó.
  it("cualquiera puede ver un capítulo de vista previa", async () => {
    expect((await call(`/chapters/${previewChapterId}/playback`)).status).toBe(503);
  });

  it("un capítulo bloqueado exige matrícula", async () => {
    expect((await call(`/chapters/${lockedChapterId}/playback`)).status).toBe(403);
    expect((await call(`/chapters/${lockedChapterId}/playback`, { cookie: outsiderCookie })).status).toBe(403);
    expect((await call(`/chapters/${lockedChapterId}/playback`, { cookie: studentCookie })).status).toBe(503);
  });

  it("una matrícula revocada pierde el acceso", async () => {
    await db.update(enrollments).set({ revokedAt: new Date() }).where(eq(enrollments.userId, studentId));
    expect((await call(`/chapters/${lockedChapterId}/playback`, { cookie: studentCookie })).status).toBe(403);
    await db.update(enrollments).set({ revokedAt: null }).where(eq(enrollments.userId, studentId));
  });
});

describe("progreso", () => {
  it("saltar al final por API no completa el capítulo", async () => {
    const res = await call(`/chapters/${lockedChapterId}/progress`, {
      method: "PUT",
      body: { positionSec: 600, ended: true },
      cookie: studentCookie,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ completed: false, justCompleted: false });
  });
});

describe("comentarios y preguntas", () => {
  it("solo los matriculados pueden comentar", async () => {
    const body = { body: "Hola", kind: "comment", parentId: null };
    expect((await call(`/chapters/${previewChapterId}/comments`, { method: "POST", body, cookie: outsiderCookie })).status).toBe(403);
    expect((await call(`/chapters/${previewChapterId}/comments`, { method: "POST", body, cookie: studentCookie })).status).toBe(201);
  });

  it("no se puede responder a una respuesta (un solo nivel)", async () => {
    const root = (await (
      await call(`/chapters/${previewChapterId}/comments`, {
        method: "POST",
        body: { body: "¿Pregunta?", kind: "question", parentId: null },
        cookie: studentCookie,
      })
    ).json()) as { id: string };
    const reply = (await (
      await call(`/chapters/${previewChapterId}/comments`, {
        method: "POST",
        body: { body: "Respuesta", kind: "question", parentId: root.id },
        cookie: studentCookie,
      })
    ).json()) as { id: string };
    const nested = await call(`/chapters/${previewChapterId}/comments`, {
      method: "POST",
      body: { body: "Anidada", kind: "question", parentId: reply.id },
      cookie: studentCookie,
    });
    expect(nested.status).toBe(400);
    const count = await db.$count(chapterComments, eq(chapterComments.parentId, reply.id));
    expect(count).toBe(0);
  });
});

describe("reseñas", () => {
  it("solo los alumnos inscritos pueden valorar (un admin sin matrícula no)", async () => {
    const body = { rating: 5, body: "Genial" };
    expect((await call(`/courses/${courseId}/review`, { method: "PUT", body, cookie: adminCookie })).status).toBe(403);
    expect((await call(`/courses/${courseId}/review`, { method: "PUT", body, cookie: outsiderCookie })).status).toBe(403);
    expect((await call(`/courses/${courseId}/review`, { method: "PUT", body, cookie: studentCookie })).status).toBe(200);
    const course = await db.query.courses.findFirst({ where: eq(courses.id, courseId) });
    expect(course).toMatchObject({ ratingAvg: 5, ratingCount: 1 });
  });
});

describe("cupones", () => {
  it("dos compras simultáneas no pueden gastar el último uso", async () => {
    const [coupon] = await db
      .insert(coupons)
      .values({ code: "ULTIMO", type: "percent", value: 10, maxRedemptions: 1 })
      .returning();
    const results = await Promise.all([
      db.transaction((tx) => reserveCouponRedemption(tx, coupon!.id)),
      db.transaction((tx) => reserveCouponRedemption(tx, coupon!.id)),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const row = await db.query.coupons.findFirst({ where: eq(coupons.id, coupon!.id) });
    expect(row?.redemptionsCount).toBe(1);
  });
});

describe("webhook de Stripe", () => {
  const stripe = new Stripe("sk_test_integration_dummy");

  async function pendingOrder(sessionId: string) {
    const [order] = await db
      .insert(orders)
      .values({
        userId: outsiderId,
        currency: "USD",
        subtotalCents: 1999,
        totalCents: 1999,
        stripeCheckoutSessionId: sessionId,
      })
      .returning();
    await db.insert(orderItems).values({ orderId: order!.id, courseId, courseTitle: "Curso test", priceCents: 1999 });
    return order!.id;
  }

  async function sendEvent(event: Record<string, unknown>) {
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    return app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": signature },
      body: payload,
    });
  }

  const sessionEvent = (id: string, type: string, object: Record<string, unknown>) => ({
    id,
    object: "event",
    type,
    data: { object: { object: "checkout.session", ...object } },
  });

  it("rechaza firmas no válidas", async () => {
    const res = await app.request("/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=bad" },
      body: "{}",
    });
    expect(res.status).toBe(400);
  });

  it("un pago se entrega una sola vez aunque el evento llegue dos veces", async () => {
    const orderId = await pendingOrder("cs_test_paid");
    const event = sessionEvent("evt_paid", "checkout.session.completed", {
      id: "cs_test_paid",
      payment_status: "paid",
      amount_total: 1999,
      payment_intent: "pi_test_paid",
      metadata: { orderId },
    });
    expect((await sendEvent(event)).status).toBe(200);
    const second = await sendEvent(event);
    expect(await second.json()).toMatchObject({ duplicate: true });

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    expect(order).toMatchObject({ status: "paid", amountPaidCents: 1999, stripePaymentIntentId: "pi_test_paid" });
    expect(await db.$count(enrollments, and(eq(enrollments.userId, outsiderId), eq(enrollments.courseId, courseId)))).toBe(1);
    expect(await db.$count(stripeEvents, eq(stripeEvents.id, "evt_paid"))).toBe(1);
  });

  it("una sesión completada sin cobrar (pago asíncrono) no matricula", async () => {
    const orderId = await pendingOrder("cs_test_unpaid");
    await sendEvent(
      sessionEvent("evt_unpaid", "checkout.session.completed", {
        id: "cs_test_unpaid",
        payment_status: "unpaid",
        amount_total: 1999,
        payment_intent: "pi_test_unpaid",
        metadata: { orderId },
      }),
    );
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    expect(order?.status).toBe("pending");
  });

  it("un reembolso revoca el acceso", async () => {
    const res = await sendEvent({
      id: "evt_refund",
      object: "event",
      type: "charge.refunded",
      data: { object: { object: "charge", id: "ch_1", refunded: true, payment_intent: "pi_test_paid" } },
    });
    expect(res.status).toBe(200);
    const enrollment = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, outsiderId), eq(enrollments.courseId, courseId)),
    });
    expect(enrollment?.revokedAt).not.toBeNull();
    const order = await db.query.orders.findFirst({ where: eq(orders.stripePaymentIntentId, "pi_test_paid") });
    expect(order?.status).toBe("refunded");
  });
});

describe("portada", () => {
  it("las reseñas destacadas excluyen las ocultas y las de menos de 4 estrellas", async () => {
    await db.insert(reviews).values([
      { userId: outsiderId, courseId, rating: 5, body: "Reseña oculta", hidden: true },
      { userId: adminId, courseId, rating: 3, body: "Reseña de tres estrellas" },
    ]);
    const res = await call("/reviews/featured?limit=10");
    expect(res.status).toBe(200);
    const { items } = (await res.json()) as { items: { body: string }[] };
    const bodies = items.map((i) => i.body);
    expect(bodies).toContain("Genial");
    expect(bodies).not.toContain("Reseña oculta");
    expect(bodies).not.toContain("Reseña de tres estrellas");
  });

  it("las cifras públicas cuentan cursos publicados y alumnos con matrícula activa", async () => {
    const res = await call("/stats");
    expect(await res.json()).toMatchObject({ publishedCourses: 1, students: 1 });
  });
});

describe("acceso con Google", () => {
  it("la web sabe que Google está activo y el login redirige al callback de la web", async () => {
    expect(await (await call("/auth-providers")).json()).toEqual({ google: true });

    const res = await call("/auth/sign-in/social", {
      method: "POST",
      body: { provider: "google", callbackURL: "/mis-cursos" },
    });
    expect(res.status).toBe(200);
    const url = new URL(((await res.json()) as { url: string }).url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3010/api/auth/callback/google");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });

  it("una cuenta sin contraseña puede crearla una sola vez y después entrar con ella", async () => {
    const userId = await createUser("google@test.dev", "Usuario Google");
    const cookie = await login("google@test.dev");
    // Simula una cuenta creada con Google: sin cuenta "credential".
    await db.delete(account).where(and(eq(account.userId, userId), eq(account.providerId, "credential")));

    const first = await call("/me/password", { method: "POST", body: { newPassword: "nueva-clave-123" }, cookie });
    expect(first.status).toBe(200);
    const again = await call("/me/password", { method: "POST", body: { newPassword: "otra-clave-456" }, cookie });
    expect(again.status).toBe(400);

    const signIn = await call("/auth/sign-in/email", {
      method: "POST",
      body: { email: "google@test.dev", password: "nueva-clave-123" },
    });
    expect(signIn.status).toBe(200);
  });

  it("crear contraseña exige sesión", async () => {
    const res = await call("/me/password", { method: "POST", body: { newPassword: "nueva-clave-123" } });
    expect(res.status).toBe(401);
  });
});
