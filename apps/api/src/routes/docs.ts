import { swaggerUI } from "@hono/swagger-ui";
import type { BetterAuthOptions } from "better-auth";
import { type Env, Hono, type Schema } from "hono";
import { generateSpecs } from "hono-openapi";
import { auth } from "../lib/auth";
import {
  TAG_DESCRIPTIONS,
  TAGS,
  baseComponents,
  optionalSession,
  validationErrorResponse,
} from "../lib/openapi";

type Spec = Awaited<ReturnType<typeof generateSpecs>>;
type Operation = NonNullable<Spec["paths"][string]["get"]>;

const DESCRIPTION = `API REST de la plataforma de cursos: catálogo, aula, carrito y pagos con Stripe, cuenta del alumno y panel de administración.

- Todas las rutas cuelgan de \`/api\` y responden JSON.
- La sesión viaja en la cookie de Better Auth (\`better-auth.session_token\`); el panel de admin además exige rol \`admin\`.
- Los errores tienen la forma \`{ "error": string, "issues"?: [{ "path", "message" }] }\`; \`issues\` solo aparece en los de validación.`;

/** Endpoints de Better Auth que se documentan (los que usa la web), con su resumen en español. */
const AUTH_OPERATIONS: Record<string, string> = {
  "post /sign-up/email": "Registrarse con email y contraseña",
  "post /sign-in/email": "Iniciar sesión con email y contraseña",
  "post /sign-in/social": "Iniciar sesión con Google (devuelve la URL de autorización)",
  "get /callback/{id}": "Vuelta del proveedor OAuth (la llama Google)",
  "post /sign-out": "Cerrar sesión",
  "get /get-session": "Ver la sesión actual (null si no hay)",
  "post /request-password-reset": "Pedir el email para restablecer la contraseña",
  "get /reset-password/{token}": "Abrir el enlace de restablecimiento (redirige a la web con el token)",
  "post /reset-password": "Restablecer la contraseña con el token del email",
  "get /verify-email": "Verificar el email (enlace del correo)",
  "post /send-verification-email": "Reenviar el email de verificación",
  "post /change-password": "Cambiar la contraseña",
  "get /list-accounts": "Listar los métodos de acceso vinculados (contraseña, Google)",
};

/**
 * Operaciones de Better Auth con la ruta relativa a /api y los esquemas que usan (User, Session...).
 * El esquema sale de su plugin openAPI sobre una copia de la configuración: esa instancia no
 * se monta ni atiende peticiones, y el plugin solo se carga cuando alguien pide la spec.
 */
async function authSpec() {
  const [{ betterAuth }, { openAPI }] = await Promise.all([import("better-auth"), import("better-auth/plugins")]);
  const options: BetterAuthOptions = auth.options;
  const generator = betterAuth({
    ...options,
    plugins: [...(options.plugins ?? []), openAPI({ disableDefaultReference: true })],
  });
  const schema = toOpenApi31(await generator.api.generateOpenAPISchema()) as {
    paths: Record<string, Record<string, Operation>>;
    components: { schemas: Record<string, object> };
  };
  const paths: Spec["paths"] = {};
  for (const [path, item] of Object.entries(schema.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      const summary = AUTH_OPERATIONS[`${method} ${path}`];
      if (!summary) continue;
      paths[`/auth${path}`] = {
        ...paths[`/auth${path}`],
        [method]: {
          ...operation,
          operationId: operation.operationId ?? method + pascalCase(path),
          summary,
          tags: [TAGS.auth],
          // Better Auth marca todo con bearer; aquí la sesión es la cookie y en el registro o el login no hace falta.
          security: optionalSession,
        },
      };
    }
  }
  const used = JSON.stringify(paths);
  const schemas = Object.fromEntries(
    Object.entries(schema.components.schemas).filter(([name]) => used.includes(`"#/components/schemas/${name}"`)),
  );
  return { paths, schemas };
}

/** "/verify-email" -> "VerifyEmail", para los operationId que Better Auth no define. */
const pascalCase = (path: string) => path.replace(/\W+(\w)?/g, (_, ch: string = "") => ch.toUpperCase());

/** Better Auth usa `nullable` (OpenAPI 3.0); en 3.1 se expresa con el tipo "null". */
function toOpenApi31(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toOpenApi31);
  if (!value || typeof value !== "object") return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toOpenApi31(item)]));
  if (result.nullable === true && typeof result.type === "string") {
    delete result.nullable;
    result.type = [result.type, "null"];
  }
  return result;
}

/**
 * Quita /api de las rutas (el servidor ya es /api), limpia operationId y seguridad y
 * ordena las respuestas por código.
 */
function tidyPaths(paths: Spec["paths"]) {
  const result: Spec["paths"] = {};
  for (const [path, item] of Object.entries(paths)) {
    for (const operation of Object.values(item) as Operation[]) {
      operation.operationId = operation.operationId?.replace(/^([a-z]+)Api(?=[A-Z]|$)/, "$1");
      // Cada middleware con metadatos repite la seguridad heredada de un .use(): se deja una vez.
      // Sin seguridad, la ruta es pública: se declara explícitamente con [].
      operation.security = [...new Map((operation.security ?? []).map((s) => [JSON.stringify(s), s])).values()];
      if (operation.responses) {
        operation.responses = Object.fromEntries(
          Object.entries(operation.responses)
            .map(([code, res]) => [code, "$ref" in res ? res : { ...res, description: res.description || "OK" }])
            .sort(([a], [b]) => String(a).localeCompare(String(b))),
        );
      }
    }
    result[path.replace(/^\/api(?=\/|$)/, "") || "/"] = item;
  }
  return result;
}

async function buildSpec<E extends Env, S extends Schema, P extends string>(app: Hono<E, S, P>) {
  const spec = await generateSpecs(app, {
    documentation: {
      info: { title: "Academia API", version: "0.1.0", description: DESCRIPTION },
      servers: [{ url: "/api", description: "Mismo origen que la web" }],
      tags: Object.entries(TAG_DESCRIPTIONS).map(([name, description]) => ({ name, description })),
      components: baseComponents,
    },
    // Las rutas sin describeRoute también aparecen (sin resumen), en vez de desaparecer de la spec.
    includeEmptyPaths: true,
    exclude: ["/api/docs"],
    defaultValidationErrorResponse: validationErrorResponse,
  });
  const authDocs = await authSpec();
  return {
    ...spec,
    paths: { ...tidyPaths(spec.paths), ...authDocs.paths },
    components: { ...spec.components, schemas: { ...authDocs.schemas, ...spec.components.schemas } },
  };
}

/**
 * GET /api/openapi.json (spec) y GET /api/docs (Swagger UI). Se montan antes del
 * límite de cuerpo y de la sesión, que no necesitan. La spec se genera en la
 * primera petición, cuando ya están registradas todas las rutas de `app`.
 */
export function apiDocsRoutes<E extends Env, S extends Schema, P extends string>(app: Hono<E, S, P>): Hono {
  let spec: ReturnType<typeof buildSpec<E, S, P>> | null = null;
  return new Hono()
    .get("/openapi.json", async (c) => {
      spec ??= buildSpec(app).catch((err) => {
        spec = null;
        throw err;
      });
      return c.json(await spec);
    })
    .get("/docs", swaggerUI({ url: "/api/openapi.json", title: "Academia API", version: "5" }));
}
