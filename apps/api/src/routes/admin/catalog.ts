import {
  adminCouponListQuerySchema,
  categoryInputSchema,
  couponInputSchema,
  pageQuerySchema,
  presignInputSchema,
} from "@academia/shared";
import { type SQL, and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { categories, couponCourses, coupons, courses } from "../../db/schema";
import { badRequest, conflict, notFound } from "../../lib/errors";
import { TAGS, routeDocs } from "../../lib/openapi";
import { okResponse } from "../../lib/openapi-schemas";
import { likePattern, offsetOf, orderByFrom, paginate } from "../../lib/pagination";
import { presignUpload } from "../../lib/storage";
import { validate } from "../../lib/validate";
import { type AppEnv, currentUser } from "../../middleware/auth";

async function assertCategorySlugFree(slug: string, exceptId?: string) {
  const existing = await db.query.categories.findFirst({
    columns: { id: true },
    where: exceptId ? and(eq(categories.slug, slug), ne(categories.id, exceptId)) : eq(categories.slug, slug),
  });
  if (existing) throw conflict("Ya existe una categoría con ese slug");
}

async function assertCouponCodeFree(code: string, exceptId?: string) {
  const existing = await db.query.coupons.findFirst({
    columns: { id: true },
    where: exceptId ? and(eq(coupons.code, code), ne(coupons.id, exceptId)) : eq(coupons.code, code),
  });
  if (existing) throw conflict("Ya existe un cupón con ese código");
}

const doc = routeDocs(TAGS.adminCatalog);

export const adminCatalogRoutes = new Hono<AppEnv>()
  /* -------------------------------- Categorías -------------------------------- */

  .get("/categories", doc("Listar categorías"), validate("query", pageQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const where = query.q
      ? or(ilike(categories.name, likePattern(query.q)), ilike(categories.slug, likePattern(query.q)))
      : undefined;
    const orderBy = orderByFrom(
      { name: categories.name, slug: categories.slug, createdAt: categories.createdAt },
      query.sort,
      query.order,
      asc(categories.name),
    );
    const [items, [total]] = await Promise.all([
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          createdAt: categories.createdAt,
          // SQL explícito: en un select de una sola tabla Drizzle no cualifica las columnas.
          coursesCount: sql<number>`(select count(*)::int from courses c where c.category_id = "categories"."id")`,
        })
        .from(categories)
        .where(where)
        .orderBy(orderBy)
        .limit(query.pageSize)
        .offset(offsetOf(query.page, query.pageSize)),
      db.select({ value: count() }).from(categories).where(where),
    ]);
    return c.json(paginate(items, total?.value ?? 0, query.page, query.pageSize));
  })

  .get("/categories/:id", doc("Ver una categoría", { errors: [404] }), async (c) => {
    const category = await db.query.categories.findFirst({ where: eq(categories.id, c.req.param("id")) });
    if (!category) throw notFound("Categoría no encontrada");
    return c.json(category);
  })

  .post(
    "/categories",
    doc("Crear una categoría", { status: 201, errors: [409] }),
    validate("json", categoryInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      await assertCategorySlugFree(input.slug);
      const [category] = await db.insert(categories).values(input).returning();
      return c.json(category!, 201);
    },
  )

  .put(
    "/categories/:id",
    doc("Actualizar una categoría", { errors: [404, 409] }),
    validate("json", categoryInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      await assertCategorySlugFree(input.slug, c.req.param("id"));
      const [category] = await db
        .update(categories)
        .set(input)
        .where(eq(categories.id, c.req.param("id")))
        .returning();
      if (!category) throw notFound("Categoría no encontrada");
      return c.json(category);
    },
  )

  .delete("/categories/:id", doc("Borrar una categoría", { response: okResponse, errors: [404] }), async (c) => {
    const [deleted] = await db.delete(categories).where(eq(categories.id, c.req.param("id"))).returning();
    if (!deleted) throw notFound("Categoría no encontrada");
    return c.json({ ok: true });
  })

  /* ---------------------------------- Cupones ---------------------------------- */

  .get("/coupons", doc("Listar cupones"), validate("query", adminCouponListQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const filters: SQL[] = [];
    if (query.q) filters.push(ilike(coupons.code, likePattern(query.q)));
    if (query.active) filters.push(eq(coupons.active, query.active === "true"));
    if (query.type) filters.push(eq(coupons.type, query.type));
    const where = filters.length ? and(...filters) : undefined;
    const orderBy = orderByFrom(
      {
        code: coupons.code,
        value: coupons.value,
        redemptionsCount: coupons.redemptionsCount,
        expiresAt: coupons.expiresAt,
        createdAt: coupons.createdAt,
      },
      query.sort,
      query.order,
      desc(coupons.createdAt),
    );
    const [items, [total]] = await Promise.all([
      db
        .select({
          id: coupons.id,
          code: coupons.code,
          type: coupons.type,
          value: coupons.value,
          appliesToAll: coupons.appliesToAll,
          maxRedemptions: coupons.maxRedemptions,
          redemptionsCount: coupons.redemptionsCount,
          expiresAt: coupons.expiresAt,
          active: coupons.active,
          createdAt: coupons.createdAt,
          coursesCount: sql<number>`(select count(*)::int from coupon_courses cc where cc.coupon_id = "coupons"."id")`,
        })
        .from(coupons)
        .where(where)
        .orderBy(orderBy)
        .limit(query.pageSize)
        .offset(offsetOf(query.page, query.pageSize)),
      db.select({ value: count() }).from(coupons).where(where),
    ]);
    return c.json(paginate(items, total?.value ?? 0, query.page, query.pageSize));
  })

  .get("/coupons/:id", doc("Ver un cupón con sus cursos", { errors: [404] }), async (c) => {
    const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, c.req.param("id")) });
    if (!coupon) throw notFound("Cupón no encontrado");
    const linked = await db
      .select({ courseId: couponCourses.courseId })
      .from(couponCourses)
      .where(eq(couponCourses.couponId, coupon.id));
    return c.json({ ...coupon, courseIds: linked.map((l) => l.courseId) });
  })

  .post(
    "/coupons",
    doc("Crear un cupón", { status: 201, errors: [409] }),
    validate("json", couponInputSchema),
    async (c) => {
      const input = c.req.valid("json");
      await assertCouponCodeFree(input.code);
      const coupon = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(coupons)
          .values({
            code: input.code,
            type: input.type,
            value: input.value,
            appliesToAll: input.appliesToAll,
            maxRedemptions: input.maxRedemptions,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            active: input.active,
          })
          .returning();
        if (!input.appliesToAll) {
          await tx.insert(couponCourses).values(input.courseIds.map((courseId) => ({ couponId: row!.id, courseId })));
        }
        return row!;
      });
      return c.json(coupon, 201);
    },
  )

  .put(
    "/coupons/:id",
    doc("Actualizar un cupón", { errors: [400, 404, 409] }),
    validate("json", couponInputSchema),
    async (c) => {
      const id = c.req.param("id");
      const input = c.req.valid("json");
      await assertCouponCodeFree(input.code, id);
      const existing = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
      if (!existing) throw notFound("Cupón no encontrado");
      if (input.maxRedemptions !== null && input.maxRedemptions < existing.redemptionsCount) {
        throw badRequest(`Ya se usó ${existing.redemptionsCount} veces: el máximo no puede ser menor`);
      }
      const coupon = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(coupons)
          .set({
            code: input.code,
            type: input.type,
            value: input.value,
            appliesToAll: input.appliesToAll,
            maxRedemptions: input.maxRedemptions,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            active: input.active,
          })
          .where(eq(coupons.id, id))
          .returning();
        await tx.delete(couponCourses).where(eq(couponCourses.couponId, id));
        if (!input.appliesToAll) {
          await tx.insert(couponCourses).values(input.courseIds.map((courseId) => ({ couponId: id, courseId })));
        }
        return row!;
      });
      return c.json(coupon);
    },
  )

  .delete("/coupons/:id", doc("Borrar un cupón", { response: okResponse, errors: [404] }), async (c) => {
    const [deleted] = await db.delete(coupons).where(eq(coupons.id, c.req.param("id"))).returning();
    if (!deleted) throw notFound("Cupón no encontrado");
    return c.json({ ok: true });
  })

  /* --------------------------------- Subidas --------------------------------- */

  .post(
    "/uploads/presign",
    doc("Prefirmar la subida de una portada o un recurso", { errors: [400, 503] }),
    validate("json", presignInputSchema),
    async (c) => {
      const me = currentUser(c);
      const input = c.req.valid("json");
      if (input.kind === "avatar") throw badRequest("Usa /me/avatar-upload para avatares");
      return c.json(await presignUpload(input, me.id));
    },
  );
