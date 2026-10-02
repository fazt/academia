import { COURSE_LEVELS, COURSE_STATUSES, VIDEO_STATUSES } from "@academia/shared";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const courseLevel = pgEnum("course_level", COURSE_LEVELS);
export const courseStatus = pgEnum("course_status", COURSE_STATUSES);
export const videoStatus = pgEnum("video_status", VIDEO_STATUSES);

export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    subtitle: text().default("").notNull(),
    description: text().default("").notNull(),
    learningOutcomes: text().array().default([]).notNull(),
    requirements: text().array().default([]).notNull(),
    level: courseLevel().default("all").notNull(),
    language: text().default("es").notNull(),
    coverImageUrl: text(),
    priceCents: integer().default(0).notNull(),
    currency: text().default("USD").notNull(),
    status: courseStatus().default("draft").notNull(),
    categoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    instructorId: text()
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    publishedAt: timestamp(),
    // Denormalizados: se recalculan en services/course-stats.ts
    durationSec: integer().default(0).notNull(),
    chaptersCount: integer().default(0).notNull(),
    ratingAvg: real().default(0).notNull(),
    ratingCount: integer().default(0).notNull(),
    studentsCount: integer().default(0).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index().on(t.status),
    index().on(t.categoryId),
    index("courses_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
  ],
);

export const sections = pgTable(
  "sections",
  {
    id: uuid().primaryKey().defaultRandom(),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text().notNull(),
    position: integer().default(0).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index().on(t.courseId, t.position)],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid().primaryKey().defaultRandom(),
    courseId: uuid()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sectionId: uuid()
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().default("").notNull(),
    position: integer().default(0).notNull(),
    isFreePreview: boolean().default(false).notNull(),
    streamUid: text(),
    videoStatus: videoStatus().default("none").notNull(),
    durationSec: integer().default(0).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index().on(t.sectionId, t.position), index().on(t.courseId), index().on(t.streamUid)],
);

export const chapterResources = pgTable(
  "chapter_resources",
  {
    id: uuid().primaryKey().defaultRandom(),
    chapterId: uuid()
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    name: text().notNull(),
    fileKey: text().notNull(),
    sizeBytes: integer().notNull(),
    mimeType: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index().on(t.chapterId)],
);
