export const USER_ROLES = ["student", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const COURSE_LEVELS = ["beginner", "intermediate", "advanced", "all"] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  all: "Todos los niveles",
};

export const COURSE_STATUSES = ["draft", "published", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

export const VIDEO_STATUSES = ["none", "uploading", "processing", "ready", "error"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  none: "Sin video",
  uploading: "Subiendo",
  processing: "Procesando",
  ready: "Listo",
  error: "Error",
};

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
  "disputed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  paid: "Pagada",
  failed: "Fallida",
  expired: "Expirada",
  refunded: "Reembolsada",
  disputed: "En disputa",
};

export const COMMENT_KINDS = ["comment", "question"] as const;
export type CommentKind = (typeof COMMENT_KINDS)[number];

export const COUPON_TYPES = ["percent", "amount"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COURSE_SORTS = ["popular", "rating", "newest", "price-asc", "price-desc"] as const;
export type CourseSort = (typeof COURSE_SORTS)[number];

export const COURSE_SORT_LABELS: Record<CourseSort, string> = {
  popular: "Más populares",
  rating: "Mejor valorados",
  newest: "Más recientes",
  "price-asc": "Precio: menor a mayor",
  "price-desc": "Precio: mayor a menor",
};
