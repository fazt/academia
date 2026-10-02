import { and, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { db, sqlClient } from "../src/db";
import { account, user, verification } from "../src/db/schema";
import { auth } from "../src/lib/auth";

const ORIGIN = "http://localhost:3010";
const PASSWORD = "password123";
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

// Los emails se imprimen en consola cuando no hay Resend: se silencian en los tests.
vi.spyOn(console, "info").mockImplementation(() => {});

/** Claims del id_token de la cuenta de Microsoft que "autoriza" la app en cada flujo. */
let microsoftUser: Record<string, unknown>;

/** Better Auth solo decodifica el id_token que recibe del endpoint de tokens: basta sin firmar. */
function idToken(claims: Record<string, unknown>) {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "none", typ: "JWT" })}.${part(claims)}.firma`;
}

// Better Auth canjea el code por fetch: se responde esa llamada y el resto pasa.
const realFetch = globalThis.fetch;
vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : input.toString();
  if (url === TOKEN_ENDPOINT) {
    const body = {
      token_type: "Bearer",
      scope: "openid profile email",
      expires_in: 3600,
      access_token: "eyJ0eXAi.token-de-acceso.prueba",
      id_token: idToken(microsoftUser),
    };
    return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  }
  return realFetch(input, init);
});

function cookiesOf(res: Response) {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .filter((c) => !c!.endsWith("="))
    .join("; ");
}

/** Pulsa "Continuar con Microsoft". */
async function startMicrosoft() {
  const res = await app.request("/api/auth/sign-in/social", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ provider: "microsoft", callbackURL: "/mis-cursos", errorCallbackURL: "/login" }),
  });
  expect(res.status).toBe(200);
  const { url } = (await res.json()) as { url: string };
  return { authorizeURL: new URL(url), cookie: cookiesOf(res) };
}

/** Microsoft vuelve al callback con un code (o con ?error= si el usuario cancela). */
async function finishMicrosoft(start: Awaited<ReturnType<typeof startMicrosoft>>, error?: string) {
  const params = new URLSearchParams({ state: start.authorizeURL.searchParams.get("state")! });
  if (error) params.set("error", error);
  else params.set("code", "code-de-prueba");
  const res = await app.request(`/api/auth/callback/microsoft?${params}`, { headers: { Cookie: start.cookie } });
  expect(res.status).toBe(302);
  return { location: res.headers.get("location"), cookie: cookiesOf(res) };
}

async function signInWithMicrosoft() {
  return finishMicrosoft(await startMicrosoft());
}

async function me(cookie: string) {
  const res = await app.request("/api/me", { headers: { Cookie: cookie } });
  expect(res.status).toBe(200);
  return (await res.json()) as { id: string; email: string; emailVerified: boolean; role: string; image: string | null };
}

async function providersOf(userId: string) {
  const rows = await db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, userId));
  return rows.map((r) => r.providerId).sort();
}

async function createPasswordUser(email: string, emailVerified: boolean) {
  const { user: created } = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "Con contraseña" } });
  if (emailVerified) await db.update(user).set({ emailVerified }).where(eq(user.id, created.id));
  return created.id;
}

beforeAll(async () => {
  await db.delete(user).where(like(user.email, "%@ms.test"));
});

beforeEach(() => {
  // Cuenta personal con el email confirmado: Microsoft emite xms_edov = true.
  microsoftUser = {
    oid: "00000000-0000-0000-0000-000000000001",
    tid: "9188040d-6c67-4c5b-b112-36a304b66dad",
    name: "Ada Lovelace",
    email: "ada@ms.test",
    xms_edov: true,
  };
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await sqlClient.end();
});

describe("login con Microsoft", () => {
  it("la web sabe que Microsoft está configurado", async () => {
    const res = await app.request("/api/auth-providers");
    expect(await res.json()).toMatchObject({ microsoft: true });
  });

  it("redirige a Microsoft con el callback de la web y solo pide la identidad", async () => {
    const { authorizeURL } = await startMicrosoft();
    expect(`${authorizeURL.origin}${authorizeURL.pathname}`).toBe(
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    );
    expect(authorizeURL.searchParams.get("client_id")).toBe("microsoft-client-test");
    expect(authorizeURL.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/callback/microsoft`);
    expect(authorizeURL.searchParams.get("scope")?.split(" ").sort()).toEqual(["email", "openid", "profile"]);
    expect(authorizeURL.searchParams.get("prompt")).toBe("select_account");
    expect(authorizeURL.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("crea la cuenta de un usuario nuevo como alumno, verificada, y abre sesión", async () => {
    const { location, cookie } = await signInWithMicrosoft();
    expect(location).toBe("/mis-cursos");

    const profile = await me(cookie);
    expect(profile).toMatchObject({ email: "ada@ms.test", emailVerified: true, role: "student", image: null });
    expect(await providersOf(profile.id)).toEqual(["microsoft"]);

    // La cuenta se identifica por el oid (no por el email) y los tokens se guardan cifrados.
    const [row] = await db.select().from(account).where(eq(account.userId, profile.id));
    expect(row?.accountId).toBe("00000000-0000-0000-0000-000000000001");
    expect(row?.accessToken).toBeTruthy();
    expect(row?.accessToken).not.toBe("eyJ0eXAi.token-de-acceso.prueba");
  });

  it("volver a entrar con la misma cuenta de Microsoft no duplica el usuario", async () => {
    const first = await signInWithMicrosoft();
    const second = await signInWithMicrosoft();
    expect(second.location).toBe("/mis-cursos");
    expect((await me(second.cookie)).id).toBe((await me(first.cookie)).id);
    expect(await db.$count(user, eq(user.email, "ada@ms.test"))).toBe(1);
  });

  it("sin xms_edov el email de Microsoft no cuenta como verificado", async () => {
    microsoftUser = { ...microsoftUser, oid: "00000000-0000-0000-0000-000000000002", email: "sin-edov@ms.test" };
    delete microsoftUser.xms_edov;

    // En los tests REQUIRE_EMAIL_VERIFICATION=false, así que hay sesión; en producción no la habría.
    const { cookie } = await signInWithMicrosoft();
    expect(await me(cookie)).toMatchObject({ email: "sin-edov@ms.test", emailVerified: false });
  });

  it("une Microsoft a una cuenta existente con el mismo email si ambos están verificados", async () => {
    const userId = await createPasswordUser("verificado@ms.test", true);
    microsoftUser = { ...microsoftUser, oid: "00000000-0000-0000-0000-000000000003", email: "verificado@ms.test" };

    const { location, cookie } = await signInWithMicrosoft();
    expect(location).toBe("/mis-cursos");
    expect((await me(cookie)).id).toBe(userId);
    expect(await providersOf(userId)).toEqual(["credential", "microsoft"]);
  });

  it("no se apropia de una cuenta existente si Microsoft no verifica el email (nOAuth)", async () => {
    const userId = await createPasswordUser("victima@ms.test", true);
    // Un tenant cualquiera puede poner el email de otra persona en el claim `email`.
    microsoftUser = {
      oid: "00000000-0000-0000-0000-000000000004",
      tid: "11111111-1111-1111-1111-111111111111",
      name: "Intruso",
      email: "victima@ms.test",
      xms_edov: false,
    };

    const { location, cookie } = await signInWithMicrosoft();
    expect(location).toBe("/login?error=account_not_linked");
    expect(cookie).not.toContain("session_token");
    expect(await providersOf(userId)).toEqual(["credential"]);
  });

  it("no une Microsoft a una cuenta cuyo email aún no se ha confirmado", async () => {
    const userId = await createPasswordUser("sin-confirmar@ms.test", false);
    microsoftUser = { ...microsoftUser, oid: "00000000-0000-0000-0000-000000000005", email: "sin-confirmar@ms.test" };

    const { location, cookie } = await signInWithMicrosoft();
    expect(location).toBe("/login?error=account_not_linked");
    expect(cookie).not.toContain("session_token");
    expect(await providersOf(userId)).toEqual(["credential"]);
  });

  it("una cuenta de Microsoft sin email vuelve al login con el error", async () => {
    microsoftUser = { ...microsoftUser, oid: "00000000-0000-0000-0000-000000000006" };
    delete microsoftUser.email;

    const { location, cookie } = await signInWithMicrosoft();
    expect(location).toBe("/login?error=email_not_found");
    expect(cookie).not.toContain("session_token");
  });

  it("si el usuario cancela en Microsoft vuelve al login con el error", async () => {
    const { location, cookie } = await finishMicrosoft(await startMicrosoft(), "access_denied");
    expect(location).toBe("/login?error=access_denied");
    expect(cookie).not.toContain("session_token");
  });

  it("una cuenta creada con Microsoft puede crear contraseña con el enlace de recuperación", async () => {
    const { cookie } = await signInWithMicrosoft();
    const profile = await me(cookie);

    const res = await app.request("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
      body: JSON.stringify({ email: profile.email, redirectTo: `${ORIGIN}/reset-password` }),
    });
    expect(res.status).toBe(200);
    // El token es el del enlace del email: se lee de la tabla de verificaciones.
    const [pending] = await db
      .select({ identifier: verification.identifier })
      .from(verification)
      .where(and(eq(verification.value, profile.id), like(verification.identifier, "reset-password:%")));
    const token = pending!.identifier.replace("reset-password:", "");

    const reset = await app.request("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ token, newPassword: "nueva-clave-123" }),
    });
    expect(reset.status).toBe(200);
    expect(await providersOf(profile.id)).toEqual(["credential", "microsoft"]);

    const signIn = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ email: profile.email, password: "nueva-clave-123" }),
    });
    expect(signIn.status).toBe(200);
  });
});
