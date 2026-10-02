import { COMMENT_KINDS } from "@academia/shared";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { chapters, courses } from "./catalog";

export const commentKind = pgEnum("comment_kind", COMMENT_KINDS);

export const chapterProgress = pgTable(
  "chapter_progress",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chapterId: uuid()
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    positionSec: integer().default(0).notNull(),
    maxPositionSec: integer().default(0).notNull(),
    firstSeenAt: timestamp().defaultNow().notNull(),
    completedAt: timestamp(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.chapterId] }), index().on(t.userId, t.courseId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    rating: smallint().notNull(),
    body: text().default("").notNull(),
    hidden: boolean().default(false).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [unique().on(t.userId, t.courseId), index().on(t.courseId)],
);

export const chapterComments = pgTable(
  "chapter_comments",
  {
    id: uuid().primaryKey().defaultRandom(),
    chapterId: uuid()
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: uuid().references((): AnyPgColumn => chapterComments.id, { onDelete: "cascade" }),
    kind: commentKind().notNull(),
    body: text().notNull(),
    isResolved: boolean().default(false).notNull(),
    hidden: boolean().default(false).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index().on(t.chapterId, t.kind, t.createdAt), index().on(t.parentId), index().on(t.courseId)],
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull().unique(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    issuedAt: timestamp().defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.courseId)],
);
