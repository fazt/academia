import { z } from "zod";
import {
  COMMENT_KINDS,
  COUPON_TYPES,
  COURSE_LEVELS,
  COURSE_SORTS,
  COURSE_STATUSES,
  ORDER_STATUSES,
  USER_ROLES,
} from "./enums";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .min(1, "El slug es obligatorio")
  .max(140)
  .regex(SLUG_RE, "Solo minúsculas, números y guiones");

const idSchema = z.uuid();

/* ------------------------------------------------------------------ */
/* Paginación y listados                                              */
/* ------------------------------------------------------------------ */

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(100).optional(),
  sort: z.string().max(40).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

export const courseListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(140).optional(),
  level: z.enum(COURSE_LEVELS).optional(),
  price: z.enum(["free", "paid"]).optional(),
  sort: z.enum(COURSE_SORTS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type CourseListQuery = z.infer<typeof courseListQuerySchema>;

export const adminCourseListQuerySchema = pageQuerySchema.extend({
  status: z.enum(COURSE_STATUSES).optional(),
  categoryId: idSchema.optional(),
});

export const adminUserListQuerySchema = pageQuerySchema.extend({
  role: z.enum(USER_ROLES).optional(),
  email: z.string().trim().max(200).optional(),
  name: z.string().trim().max(200).optional(),
});

export const adminOrderListQuerySchema = pageQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  email: z.string().trim().max(200).optional(),
});

export const adminCouponListQuerySchema = pageQuerySchema.extend({
  active: z.enum(["true", "false"]).optional(),
  type: z.enum(COUPON_TYPES).optional(),
});

export const adminReviewListQuerySchema = pageQuerySchema.extend({
  courseId: idSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  hidden: z.enum(["true", "false"]).optional(),
});

export const adminCommentListQuerySchema = pageQuerySchema.extend({
  courseId: idSchema.optional(),
  kind: z.enum(COMMENT_KINDS).optional(),
  /** "unanswered": preguntas sin respuesta de un admin y sin resolver */
  status: z.enum(["unanswered", "resolved", "hidden"]).optional(),
});

/* ------------------------------------------------------------------ */
/* Catálogo (admin)                                                   */
/* ------------------------------------------------------------------ */

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(60),
  slug: slugSchema,
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

const listItem = z.string().trim().min(1).max(200);

export const courseInputSchema = z.object({
  title: z.string().trim().min(3, "Mínimo 3 caracteres").max(120),
  slug: slugSchema,
  subtitle: z.string().trim().max(200),
  description: z.string().max(20000),
  learningOutcomes: z.array(listItem).max(20),
  requirements: z.array(listItem).max(20),
  level: z.enum(COURSE_LEVELS),
  language: z.string().trim().min(2).max(10),
  categoryId: idSchema.nullable(),
  instructorId: z.string().min(1, "Elige un instructor"),
  coverImageUrl: z.url("URL no válida").nullable(),
  priceCents: z
    .number()
    .int()
    .min(0, "El precio no puede ser negativo")
    .max(100_000_00, "Precio demasiado alto")
    .refine((v) => v === 0 || v >= 50, "El precio mínimo es 0,50 o gratis"),
});
export type CourseInput = z.infer<typeof courseInputSchema>;

export const courseStatusInputSchema = z.object({
  status: z.enum(COURSE_STATUSES),
});

export const sectionInputSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
});
export type SectionInput = z.infer<typeof sectionInputSchema>;

export const chapterInputSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(160),
  description: z.string().max(10000),
  isFreePreview: z.boolean(),
});
export type ChapterInput = z.infer<typeof chapterInputSchema>;

export const chapterCreateSchema = chapterInputSchema.extend({
  sectionId: idSchema,
});

export const reorderSchema = z.object({
  ids: z.array(idSchema).min(1).max(500),
});

export const curriculumReorderSchema = z.object({
  sections: z
    .array(
      z.object({
        id: idSchema,
        chapterIds: z.array(idSchema).max(500),
      }),
    )
    .max(200),
});
export type CurriculumReorder = z.infer<typeof curriculumReorderSchema>;

export const videoUploadInputSchema = z.object({
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(30 * 1024 ** 3, "El archivo supera los 30 GB"),
  filename: z.string().trim().min(1).max(255),
});

export const resourceInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  fileKey: z.string().min(1).max(512),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1).max(160),
});

export const presignInputSchema = z.object({
  kind: z.enum(["cover", "resource", "avatar"]),
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().min(1).max(160),
  sizeBytes: z.number().int().positive(),
});
export type PresignInput = z.infer<typeof presignInputSchema>;

/* ------------------------------------------------------------------ */
/* Cupones                                                            */
/* ------------------------------------------------------------------ */

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Mínimo 3 caracteres")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Solo letras, números, guiones y guiones bajos")
      .transform((v) => v.toUpperCase()),
    type: z.enum(COUPON_TYPES),
    value: z.number().int().positive("Debe ser mayor que 0"),
    appliesToAll: z.boolean(),
    courseIds: z.array(idSchema).max(200),
    maxRedemptions: z.number().int().positive().nullable(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
    active: z.boolean(),
  })
  .refine((c) => c.type !== "percent" || c.value <= 100, {
    message: "El porcentaje no puede superar 100",
    path: ["value"],
  })
  .refine((c) => c.appliesToAll || c.courseIds.length > 0, {
    message: "Elige al menos un curso o aplica a todos",
    path: ["courseIds"],
  });
export type CouponInput = z.input<typeof couponInputSchema>;

/* ------------------------------------------------------------------ */
/* Carrito y checkout                                                 */
/* ------------------------------------------------------------------ */

export const cartAddSchema = z.object({ courseId: idSchema });

export const cartMergeSchema = z.object({
  courseIds: z.array(idSchema).max(100),
});

export const couponValidateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  courseIds: z.array(idSchema).max(100).optional(),
});

export const checkoutSchema = z.object({
  couponCode: z.string().trim().max(40).optional(),
  /** "Comprar ahora": compra un único curso sin tocar el carrito */
  courseId: idSchema.optional(),
});

/* ------------------------------------------------------------------ */
/* Aprendizaje y comunidad                                            */
/* ------------------------------------------------------------------ */

export const progressInputSchema = z.object({
  positionSec: z.number().min(0).max(60 * 60 * 24),
  /** El reproductor indica que el video terminó */
  ended: z.boolean().optional(),
});

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, "Elige una puntuación").max(5),
  body: z.string().trim().max(3000),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const commentInputSchema = z.object({
  body: z.string().trim().min(1, "Escribe algo").max(5000),
  kind: z.enum(COMMENT_KINDS),
  parentId: idSchema.nullable(),
});
export type CommentInput = z.infer<typeof commentInputSchema>;

export const commentUpdateSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const commentListQuerySchema = z.object({
  kind: z.enum(COMMENT_KINDS),
});

/* ------------------------------------------------------------------ */
/* Perfil y usuarios                                                  */
/* ------------------------------------------------------------------ */

export const profileInputSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  headline: z.string().trim().max(120),
  bio: z.string().trim().max(2000),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const avatarInputSchema = z.object({
  image: z.url().nullable(),
});

export const userRoleInputSchema = z.object({
  role: z.enum(USER_ROLES),
});

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128, "Máximo 128 caracteres");

export const loginSchema = z.object({
  email: z.email("Email no válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  email: z.email("Email no válido"),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.email("Email no válido"),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });
