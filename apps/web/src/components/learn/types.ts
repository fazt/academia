import type { InferResponseType } from "hono/client";
import type { api } from "@/lib/api";

export type LearnData = InferResponseType<(typeof api.me.courses)[":slug"]["learn"]["$get"], 200>;
export type LearnSection = LearnData["sections"][number];
export type LearnChapter = LearnSection["chapters"][number];
export type LearnResource = LearnChapter["resources"][number];

export type MyCourse = InferResponseType<typeof api.me.courses.$get, 200>["items"][number];
export type MyOrder = InferResponseType<typeof api.me.orders.$get, 200>["items"][number];
export type MyCertificate = InferResponseType<typeof api.me.certificates.$get, 200>["items"][number];

export type ChapterComment = InferResponseType<
  (typeof api.chapters)[":id"]["comments"]["$get"],
  200
>["items"][number];
export type ChapterReply = ChapterComment["replies"][number];

export const learnQueryKey = (slug: string) => ["learn", slug] as const;

/** Lista plana de capítulos en orden de currículo. */
export function flattenChapters(sections: LearnSection[]) {
  return sections.flatMap((section) => section.chapters.map((chapter) => ({ ...chapter, sectionId: section.id })));
}
