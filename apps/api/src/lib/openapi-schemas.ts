import { COURSE_LEVELS, VIDEO_STATUSES } from "@academia/shared";
import { type ZodType, z } from "zod";

/**
 * Esquemas de respuesta para la documentación OpenAPI. Solo describen lo que
 * devuelven los handlers (no validan nada en ejecución); el test de integración
 * comprueba que siguen cuadrando con las respuestas reales.
 */

const dateTime = z.string().meta({ format: "date-time", example: "2026-01-15T10:30:00.000Z" });
const uuid = z.string().meta({ format: "uuid" });
// Entero sin los límites de "safe integer" que Zod añade al JSON Schema de .int().
const int = z.number().meta({ type: "integer" });

const paginated = <T extends ZodType>(item: T) =>
  z.object({ items: z.array(item), total: int, page: int, pageSize: int, pageCount: int });

export const okResponse = z.object({ ok: z.literal(true) }).meta({ ref: "Ok" });

/* ------------------------------------------------------------------ */
/* Catálogo público                                                   */
/* ------------------------------------------------------------------ */

export const authProvidersResponse = z
  .object({ google: z.boolean(), github: z.boolean(), microsoft: z.boolean() })
  .meta({ ref: "AuthProviders" });

export const publicStatsResponse = z
  .object({ publishedCourses: int, students: int.meta({ description: "Alumnos con alguna matrícula activa" }) })
  .meta({ ref: "PublicStats" });

export const featuredReviewsResponse = z.object({
  items: z.array(
    z
      .object({
        id: uuid,
        rating: int.min(1).max(5),
        body: z.string(),
        createdAt: dateTime,
        author: z.object({ name: z.string() }),
        course: z.object({ title: z.string(), slug: z.string() }),
      })
      .meta({ ref: "FeaturedReview" }),
  ),
});

export const categoriesResponse = z.object({
  items: z.array(
    z
      .object({
        id: uuid,
        name: z.string(),
        slug: z.string(),
        coursesCount: int.meta({ description: "Cursos publicados de la categoría" }),
      })
      .meta({ ref: "Category" }),
  ),
});

const categoryRef = z.object({ name: z.string(), slug: z.string() }).nullable();

const courseCard = z
  .object({
    id: uuid,
    slug: z.string(),
    title: z.string(),
    subtitle: z.string(),
    coverImageUrl: z.string().nullable(),
    priceCents: int.meta({ description: "Precio en céntimos; 0 = gratis" }),
    currency: z.string().meta({ example: "USD" }),
    level: z.enum(COURSE_LEVELS),
    ratingAvg: z.number(),
    ratingCount: int,
    studentsCount: int,
    durationSec: int,
    chaptersCount: int,
    publishedAt: dateTime.nullable(),
    instructor: z.object({ id: z.string(), name: z.string() }),
    category: categoryRef,
  })
  .meta({ ref: "CourseCard" });

export const courseListResponse = paginated(courseCard).meta({ ref: "CourseList" });

export const courseCardsResponse = z.object({ items: z.array(courseCard) });

const curriculumSection = z
  .object({
    id: uuid,
    title: z.string(),
    chapters: z.array(
      z.object({
        id: uuid,
        title: z.string(),
        description: z.string(),
        isFreePreview: z.boolean(),
        videoStatus: z.enum(VIDEO_STATUSES),
        durationSec: int,
        hasVideo: z.boolean(),
        streamUid: z.string().nullable().meta({ description: "Solo en el panel de admin; null en el resto" }),
        resources: z.array(
          z.object({
            id: uuid,
            name: z.string(),
            sizeBytes: int,
            mimeType: z.string(),
            fileKey: z.string().nullable().meta({ description: "Solo en el panel de admin" }),
          }),
        ),
      }),
    ),
  })
  .meta({ ref: "CurriculumSection" });

export const courseDetailResponse = z
  .object({
    id: uuid,
    slug: z.string(),
    title: z.string(),
    subtitle: z.string(),
    description: z.string(),
    learningOutcomes: z.array(z.string()),
    requirements: z.array(z.string()),
    level: z.enum(COURSE_LEVELS),
    language: z.string(),
    coverImageUrl: z.string().nullable(),
    priceCents: int,
    currency: z.string(),
    ratingAvg: z.number(),
    ratingCount: int,
    studentsCount: int,
    durationSec: int,
    chaptersCount: int,
    publishedAt: dateTime.nullable(),
    updatedAt: dateTime,
    instructor: z.object({
      id: z.string(),
      name: z.string(),
      image: z.string().nullable(),
      headline: z.string(),
      bio: z.string(),
    }),
    category: categoryRef,
    sections: z.array(curriculumSection).meta({ description: "Currículo (sin recursos ni uid de video)" }),
    resourcesCount: int,
  })
  .meta({ ref: "CourseDetail" });

export const courseReviewsResponse = paginated(
  z.object({
    id: uuid,
    rating: int.min(1).max(5),
    body: z.string(),
    createdAt: dateTime,
    updatedAt: dateTime,
    author: z.object({ name: z.string(), image: z.string().nullable() }),
  }),
)
  .extend({ distribution: z.array(z.object({ stars: int.min(1).max(5), count: int })) })
  .meta({ ref: "CourseReviews" });

export const certificateResponse = z
  .object({
    code: z.string().meta({ example: "ABCDE-23456" }),
    issuedAt: dateTime,
    studentName: z.string(),
    course: z.object({ title: z.string(), slug: z.string(), durationSec: int }),
    instructorName: z.string(),
  })
  .meta({ ref: "Certificate" });

export const pdfContent = {
  "application/pdf": { schema: { type: "string" as const, format: "binary" } },
};

/* ------------------------------------------------------------------ */
/* Carrito, checkout y cuenta                                         */
/* ------------------------------------------------------------------ */

export const cartSummaryResponse = z
  .object({
    items: z.array(courseCard.extend({ discountCents: int, totalCents: int })),
    subtotalCents: int,
    discountCents: int,
    totalCents: int,
    couponCode: z.string().nullable(),
    currency: z.string(),
  })
  .meta({ ref: "CartSummary" });

export const checkoutResponse = z
  .object({
    type: z.enum(["enrolled", "redirect"]).meta({
      description: "`enrolled`: matrícula directa (total 0). `redirect`: abrir `url` (Stripe Checkout)",
    }),
    url: z.string().nullable(),
    courseSlugs: z.array(z.string()).meta({ description: "Cursos matriculados cuando type = enrolled" }),
  })
  .meta({ ref: "CheckoutResult" });

export const myCertificatesResponse = z.object({
  items: z.array(
    z.object({
      code: z.string(),
      issuedAt: dateTime,
      course: z.object({ id: uuid, title: z.string(), slug: z.string(), coverImageUrl: z.string().nullable() }),
    }),
  ),
});

/* ------------------------------------------------------------------ */
/* Webhooks                                                           */
/* ------------------------------------------------------------------ */

export const webhookAckResponse = z
  .object({
    received: z.literal(true),
    duplicate: z.literal(true).optional().meta({ description: "Evento de Stripe ya procesado" }),
    ignored: z.literal(true).optional().meta({ description: "Video de Stream ajeno a esta instalación" }),
  })
  .meta({ ref: "WebhookAck" });
