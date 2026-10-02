import type { InferResponseType } from "hono/client";
import type { api } from "@/lib/api";

/** Curso completo para el editor del panel (incluye currículo con uids y recursos). */
export type AdminCourse = InferResponseType<(typeof api.admin.courses)[":id"]["$get"], 200>;
export type AdminSection = AdminCourse["sections"][number];
export type AdminChapter = AdminSection["chapters"][number];
export type AdminResource = AdminChapter["resources"][number];
