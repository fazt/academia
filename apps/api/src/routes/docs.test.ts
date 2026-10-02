import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Sin base de datos: la spec solo recorre las rutas registradas y el cliente de
// Postgres no conecta hasta la primera consulta.
async function loadApp(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return (await import("../app")).default;
}

type Operation = { tags?: string[]; summary?: string; security?: unknown[]; [key: string]: unknown };
type Spec = {
  openapi: string;
  info: { title: string };
  servers: { url: string }[];
  paths: Record<string, Record<string, Operation>>;
  components: { securitySchemes: Record<string, unknown> };
};

let spec: Spec;

beforeAll(async () => {
  const app = await loadApp({ NODE_ENV: "test" });
  const res = await app.request("/api/openapi.json");
  expect(res.status).toBe(200);
  spec = (await res.json()) as Spec;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("spec OpenAPI", () => {
  it("es OpenAPI 3 con servidor relativo /api e incluye las rutas principales", () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBe("Academia API");
    expect(spec.servers).toEqual([expect.objectContaining({ url: "/api" })]);
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        "/courses",
        "/courses/{slug}",
        "/categories",
        "/checkout",
        "/me",
        "/admin/courses",
        "/webhooks/stripe",
        "/auth/sign-in/email",
      ]),
    );
  });

  it("define la cookie de sesión y la exige en las rutas privadas y de admin", () => {
    expect(spec.components.securitySchemes.sessionCookie).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
    });
    expect(spec.paths["/checkout"]!.post!.security).toEqual([{ sessionCookie: [] }]);
    expect(spec.paths["/admin/courses"]!.get!.security).toEqual([{ sessionCookie: [] }]);
    expect(spec.paths["/admin/courses"]!.get!.responses).toHaveProperty("403");
    expect(spec.paths["/courses"]!.get!.security).toEqual([]);
  });

  it("deriva parámetros y cuerpos de los esquemas Zod de los validadores", () => {
    const params = spec.paths["/courses"]!.get!.parameters as { name: string; in: string }[];
    expect(params).toEqual(expect.arrayContaining([expect.objectContaining({ name: "level", in: "query" })]));
    expect(spec.paths["/checkout"]!.post!.requestBody).toMatchObject({
      content: { "application/json": { schema: { properties: { couponCode: { type: "string" } } } } },
    });
  });

  it("todas las operaciones tienen etiqueta y resumen", () => {
    const missing = Object.entries(spec.paths).flatMap(([path, item]) =>
      Object.entries(item)
        .filter(([, op]) => !op.tags?.length || !op.summary)
        .map(([method]) => `${method.toUpperCase()} ${path}`),
    );
    expect(missing).toEqual([]);
  });
});

describe("Swagger UI", () => {
  it("se sirve en /api/docs y apunta a la spec", async () => {
    const app = await loadApp({ NODE_ENV: "test" });
    const res = await app.request("/api/docs");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("/api/openapi.json");
  });

  it("en producción no se expone salvo con ENABLE_API_DOCS=true", async () => {
    const prod = await loadApp({ NODE_ENV: "production", ENABLE_API_DOCS: "false" });
    expect((await prod.request("/api/openapi.json")).status).toBe(404);
    expect((await prod.request("/api/docs")).status).toBe(404);

    const enabled = await loadApp({ NODE_ENV: "production", ENABLE_API_DOCS: "true" });
    expect((await enabled.request("/api/docs")).status).toBe(200);
  });
});
