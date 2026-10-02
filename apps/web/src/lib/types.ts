import type { InferResponseType } from "hono/client";
import type { api } from "@/lib/api";

/** Tipos de respuesta de la API, inferidos del cliente RPC. */
export type CourseCardData = InferResponseType<typeof api.courses.$get, 200>["items"][number];
export type CourseDetail = InferResponseType<(typeof api.courses)[":slug"]["$get"], 200>;
export type CurriculumSection = CourseDetail["sections"][number];
export type CurriculumChapter = CurriculumSection["chapters"][number];
export type Category = InferResponseType<typeof api.categories.$get, 200>["items"][number];
