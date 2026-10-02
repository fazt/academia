import type { ValidationTargets } from "hono";
import {
  type DescribeRouteOptions,
  type GenerateSpecOptions,
  describeRoute,
  resolver,
  uniqueSymbol,
} from "hono-openapi";
import type { ZodType } from "zod";

/**
 * Documentación OpenAPI con hono-openapi. Las rutas no se reescriben: cada una
 * lleva un describeRoute (resumen, etiqueta y respuestas) y la spec deriva
 * parámetros y cuerpos de los mismos esquemas Zod que validan (lib/validate.ts).
 * La sesión y el rol salen de requireAuth/requireAdmin (middleware/auth.ts).
 */

/** Etiquetas por módulo, en el orden en que aparecen en Swagger UI. */
export const TAGS = {
  system: "Sistema",
  auth: "Autenticación",
  public: "Catálogo público",
  learn: "Aula",
  cart: "Carrito y pagos",
  me: "Mi cuenta",
  adminCourses: "Admin: cursos y currículo",
  adminCatalog: "Admin: catálogo y cupones",
  adminPeople: "Admin: personas y órdenes",
  adminStats: "Admin: estadísticas",
  webhooks: "Webhooks",
} as const;
type Tag = (typeof TAGS)[keyof typeof TAGS];

const ADMIN_NOTE = "Requiere sesión con rol `admin`.";

export const TAG_DESCRIPTIONS: Record<Tag, string> = {
  [TAGS.system]: "Estado de la API.",
  [TAGS.auth]:
    "Endpoints de Better Auth (`/api/auth/*`) que usa la web, generados por su plugin `openAPI`. " +
    "Sus errores tienen la forma `{ message, code }` en vez de `{ error }`. Los que actúan sobre la cuenta " +
    "(cerrar sesión, cambiar la contraseña...) usan la cookie de sesión.",
  [TAGS.public]: "Catálogo, reseñas y certificados. No requieren sesión.",
  [TAGS.learn]: "Reproducción, progreso, comentarios y reseñas del alumno.",
  [TAGS.cart]: "Carrito, cupones y checkout con Stripe.",
  [TAGS.me]: "Perfil, cursos, compras y certificados de la sesión actual.",
  [TAGS.adminCourses]: `Cursos, secciones, capítulos, videos y recursos. ${ADMIN_NOTE}`,
  [TAGS.adminCatalog]: `Categorías, cupones y subidas de archivos. ${ADMIN_NOTE}`,
  [TAGS.adminPeople]: `Usuarios, matrículas, órdenes, reseñas y comentarios. ${ADMIN_NOTE}`,
  [TAGS.adminStats]: `Métricas del panel. ${ADMIN_NOTE}`,
  [TAGS.webhooks]:
    "Los llama el proveedor, no la web. Leen el cuerpo raw y rechazan con 400 cualquier petición sin una firma válida.",
};

/* ------------------------------------------------------------------ */
/* Seguridad y errores                                                */
/* ------------------------------------------------------------------ */

export const SECURITY_SCHEME = "sessionCookie";
const SESSION_COOKIE = "better-auth.session_token";

const ERRORS = {
  400: ["BadRequest", "Solicitud no válida: datos que no pasan la validación (con `issues`) o una regla de negocio."],
  401: ["Unauthorized", "Falta la sesión o ha caducado."],
  403: ["Forbidden", "La sesión no tiene permiso para este recurso."],
  404: ["NotFound", "El recurso no existe."],
  409: ["Conflict", "Choca con el estado actual (slug o código repetido, cupón agotado, curso con ventas...)."],
  503: ["ServiceUnavailable", "Falta configurar un servicio externo (Stripe, Cloudflare Stream o Spaces)."],
} as const;
type ErrorStatus = keyof typeof ERRORS;

const errorRef = (status: ErrorStatus) => ({ $ref: `#/components/responses/${ERRORS[status][0]}` });

/** Componentes fijos de la spec: esquema de error, respuestas de error y cookie de sesión. */
export const baseComponents = {
  schemas: {
    // Forma común de los errores (app.onError).
    Error: {
      type: "object",
      required: ["error"],
      properties: {
        error: { type: "string", description: "Mensaje para mostrar al usuario", example: "Curso no encontrado" },
        issues: {
          type: "array",
          description: "Solo en errores de validación",
          items: {
            type: "object",
            required: ["path", "message"],
            properties: {
              path: { type: "string", example: "email" },
              message: { type: "string", example: "Email no válido" },
            },
          },
        },
      },
    },
  },
  responses: Object.fromEntries(
    Object.values(ERRORS).map(([name, description]) => [
      name,
      { description, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    ]),
  ),
  securitySchemes: {
    [SECURITY_SCHEME]: {
      type: "apiKey",
      in: "cookie",
      name: SESSION_COOKIE,
      description:
        "Cookie de sesión de Better Auth; la crea `POST /auth/sign-in/email`. En producción (HTTPS) se llama " +
        "`__Secure-better-auth.session_token`. Las rutas de admin además exigen rol `admin`. Para probarlas " +
        "aquí, inicia sesión en la web en el mismo origen: el navegador envía la cookie solo.",
    },
  },
} satisfies NonNullable<GenerateSpecOptions["documentation"]["components"]>;

/** 400 que hono-openapi añade a las rutas con validador (una referencia también es válida en OpenAPI). */
export const validationErrorResponse = errorRef(400) as unknown as Exclude<
  GenerateSpecOptions["defaultValidationErrorResponse"],
  boolean
>;

/** Sesión opcional: la ruta responde sin cookie, pero con ella puede dar más acceso. */
export const optionalSession: Record<string, string[]>[] = [{}, { [SECURITY_SCHEME]: [] }];

/* ------------------------------------------------------------------ */
/* Metadatos de rutas y middlewares                                   */
/* ------------------------------------------------------------------ */

/**
 * Adjunta metadatos de OpenAPI a un middleware sin cambiar su tipo ni su
 * comportamiento: la spec los aplica a todas las rutas que lo usan.
 */
export function withDocs<T extends object>(middleware: T, spec: DescribeRouteOptions): T {
  return Object.defineProperty(middleware, uniqueSymbol, { value: { spec } });
}

/** Igual, para un validador: la spec genera los parámetros o el cuerpo desde el esquema Zod. */
export function withValidatorDocs<T extends object>(
  middleware: T,
  target: keyof ValidationTargets,
  schema: ZodType,
): T {
  return Object.defineProperty(middleware, uniqueSymbol, { value: { target, ...resolver(schema) } });
}

export const sessionDocs: DescribeRouteOptions = {
  security: [{ [SECURITY_SCHEME]: [] }],
  responses: { 401: errorRef(401) },
};

export const adminDocs: DescribeRouteOptions = {
  security: [{ [SECURITY_SCHEME]: [] }],
  responses: { 401: errorRef(401), 403: errorRef(403) },
};

interface RouteDoc {
  description?: string;
  /** Código de la respuesta correcta (200 por defecto). */
  status?: 200 | 201;
  /** Esquema Zod de la respuesta correcta, si está documentada. */
  response?: ZodType;
  /** Descripción de la respuesta correcta. */
  ok?: string;
  /** Errores propios de la ruta; el 400 de validación y los de sesión se añaden solos. */
  errors?: readonly ErrorStatus[];
  /** Resto de campos de la operación (cabeceras, cuerpos no JSON, seguridad...). */
  extra?: DescribeRouteOptions;
}

/**
 * describeRoute con la etiqueta del módulo:
 * `const doc = routeDocs(TAGS.public)` y luego `doc("Listar cursos", { response, errors })`.
 */
export const routeDocs =
  (tag: Tag) =>
  (summary: string, { description, status = 200, response, ok, errors = [], extra }: RouteDoc = {}) =>
    describeRoute({
      tags: [tag],
      summary,
      description,
      ...extra,
      responses: {
        [status]: {
          description: ok ?? (status === 201 ? "Creado" : "OK"),
          ...(response && { content: { "application/json": { schema: resolver(response) } } }),
        },
        ...Object.fromEntries(errors.map((code) => [code, errorRef(code)])),
        ...extra?.responses,
      },
    });
