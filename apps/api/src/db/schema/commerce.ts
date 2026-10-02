import { COUPON_TYPES, ORDER_STATUSES } from "@academia/shared";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { courses } from "./catalog";

export const orderStatus = pgEnum("order_status", ORDER_STATUSES);
export const couponType = pgEnum("coupon_type", COUPON_TYPES);

export const coupons = pgTable("coupons", {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  type: couponType().notNull(),
  /** percent: 1-100 · amount: céntimos */
  value: integer().notNull(),
  appliesToAll: boolean().default(true).notNull(),
  maxRedemptions: integer(),
  /** Incluye las reservas de órdenes pendientes; se libera si la orden expira o falla. */
  redemptionsCount: integer().default(0).notNull(),
  expiresAt: timestamp(),
  active: boolean().default(true).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const couponCourses = pgTable(
  "coupon_courses",
  {
    couponId: uuid()
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.couponId, t.courseId] })],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: orderStatus().default("pending").notNull(),
    currency: text().notNull(),
    subtotalCents: integer().notNull(),
    discountCents: integer().default(0).notNull(),
    totalCents: integer().notNull(),
    /** Lo que Stripe cobró realmente (amount_total). */
    amountPaidCents: integer(),
    couponId: uuid().references(() => coupons.id, { onDelete: "set null" }),
    couponCode: text(),
    /** true mientras la orden mantiene reservado un canje del cupón */
    couponReserved: boolean().default(false).notNull(),
    stripeCheckoutSessionId: text().unique(),
    stripePaymentIntentId: text(),
    expiresAt: timestamp(),
    paidAt: timestamp(),
    refundedAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index().on(t.userId), index().on(t.status), index().on(t.stripePaymentIntentId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    courseTitle: text().notNull(),
    priceCents: integer().notNull(),
    discountCents: integer().default(0).notNull(),
  },
  (t) => [index().on(t.orderId), index().on(t.courseId)],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    orderId: uuid().references(() => orders.id, { onDelete: "set null" }),
    revokedAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.courseId), index().on(t.courseId)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text().primaryKey(),
  type: text().notNull(),
  processedAt: timestamp().defaultNow().notNull(),
});
