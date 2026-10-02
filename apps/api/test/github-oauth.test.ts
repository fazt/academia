import { and, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { db, sqlClient } from "../src/db";
import { account, user } from "../src/db/schema";
import { auth } from "../src/lib/auth";

const ORIGIN = "http://localhost:3010";
const PASSWORD = "password123";

// Los emails se imprimen en consola cuando no hay Resend: se silencian en los tests.
vi.spyOn(console, "info").mockImplementation(() => {});

/** Cuenta de GitHub que "autoriza" la app en cada flujo. */
let githubUser: { id: number; login: string; name: string | null; email: string; verified: boolean };

// Better Auth habla con GitHub por fetch: se responden esas tres llamadas y el resto pasa.
const realFetch = globalThis.fetch;
vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : input.toString();
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  if (url === "https://github.com/login/oauth/access_token") {
    return json({ access_token: "gho_token_de_prueba", token_type: "bearer", scope: "read:user,user:email" });
  }
  if (url === "https://api.github.com/user") {
    const { id, login, name } = githubUser;
    return json({ id, login, name, email: null, avatar_url: `https://avatars.githubusercontent.com/u/${id}` });
  }
  if (url === "https://api.github.com/user/emails") {
    return json([{ email: githubUser.email, primary: true, verified: githubUser.verified, visibility: "private" }]);
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

/** Pulsa "Continuar con GitHub" (o "Conectar" en el perfil si se pasa la cookie de sesión). */
async function startGithub(opts: { cookie?: string; callbackURL?: string; errorCallbackURL?: string } = {}) {
  const res = await app.request(opts.cookie ? "/api/auth/link-social" : "/api/auth/sign-in/social", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: JSON.stringify({
      provider: "github",
      callbackURL: opts.callbackURL ?? "/mis-cursos",
      errorCallbackURL: opts.errorCallbackURL ?? "/login",
    }),
  });
  expect(res.status).toBe(200);
  const { url } = (await res.json()) as { url: string };
  const cookie = [opts.cookie, cookiesOf(res)].filter(Boolean).join("; ");
  return { authorizeURL: new URL(url), cookie };
}

/** GitHub vuelve al callback con un code (o con ?error= si el usuario cancela). */
async function finishGithub(start: Awaited<ReturnType<typeof startGithub>>, error?: string) {
  const params = new URLSearchParams({ state: start.authorizeURL.searchParams.get("state")! });
  if (error) params.set("error", error);
  else params.set("code", "code-de-prueba");
  const res = await app.request(`/api/auth/callback/github?${params}`, { headers: { Cookie: start.cookie } });
  expect(res.status).toBe(302);
  return { location: res.headers.get("location"), cookie: cookiesOf(res) };
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

async function login(email: string) {
  const res = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  expect(res.status).toBe(200);
  return cookiesOf(res);
}

async function listAccounts(cookie: string) {
  const res = await app.request("/api/auth/list-accounts", { headers: { Cookie: cookie } });
  expect(res.status).toBe(200);
  return (await res.json()) as { id: string; providerId: string }[];
}

function unlink(cookie: string, accountId: string) {
  return app.request("/api/auth/unlink-account", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
    body: JSON.stringify({ accountId }),
  });
}

beforeAll(async () => {
  await db.delete(user).where(like(user.email, "%@gh.test"));
});

beforeEach(() => {
  githubUser = { id: 1001, login: "octo", name: "Octo Cat", email: "octo@gh.test", verified: true };
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await sqlClient.end();
});

describe("login con GitHub", () => {
  it("la web sabe que GitHub está configurado", async () => {
    const res = await app.request("/api/auth-providers");
    expect(await res.json()).toEqual({ github: true });
  });

  it("redirige a GitHub con el callback de la web y solo pide leer el perfil y el email", async () => {
    const { authorizeURL } = await startGithub();
    expect(`${authorizeURL.origin}${authorizeURL.pathname}`).toBe("https://github.com/login/oauth/authorize");
    expect(authorizeURL.searchParams.get("client_id")).toBe("github-client-test");
    expect(authorizeURL.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/callback/github`);
    expect(authorizeURL.searchParams.get("scope")?.split(" ").sort()).toEqual(["read:user", "user:email"]);
  });

  it("crea la cuenta de un usuario nuevo como alumno y abre sesión", async () => {
    const { location, cookie } = await finishGithub(await startGithub());
    expect(location).toBe("/mis-cursos");

    const profile = await me(cookie);
    expect(profile).toMatchObject({
      email: "octo@gh.test",
      emailVerified: true,
      role: "student",
      image: "https://avatars.githubusercontent.com/u/1001",
    });
    expect(await providersOf(profile.id)).toEqual(["github"]);

    const [row] = await db.select().from(account).where(eq(account.userId, profile.id));
    expect(row?.accountId).toBe("1001");
    expect(row?.accessToken).toBeTruthy();
    expect(row?.accessToken).not.toBe("gho_token_de_prueba");
  });

  it("volver a entrar con la misma cuenta de GitHub no duplica el usuario", async () => {
    const first = await finishGithub(await startGithub());
    const second = await finishGithub(await startGithub());
    expect(second.location).toBe("/mis-cursos");
    expect((await me(second.cookie)).id).toBe((await me(first.cookie)).id);
    expect(await db.$count(user, eq(user.email, "octo@gh.test"))).toBe(1);
  });

  it("une GitHub a una cuenta existente con el mismo email si ambos están verificados", async () => {
    const userId = await createPasswordUser("verificado@gh.test", true);
    githubUser = { id: 2002, login: "verif", name: null, email: "verificado@gh.test", verified: true };

    const { location, cookie } = await finishGithub(await startGithub());
    expect(location).toBe("/mis-cursos");
    expect((await me(cookie)).id).toBe(userId);
    expect(await providersOf(userId)).toEqual(["credential", "github"]);
  });

  it("no une GitHub a una cuenta cuyo email aún no se ha confirmado", async () => {
    const userId = await createPasswordUser("sin-confirmar@gh.test", false);
    githubUser = { id: 3003, login: "intruso", name: null, email: "sin-confirmar@gh.test", verified: true };

    const { location, cookie } = await finishGithub(await startGithub());
    expect(location).toBe("/login?error=account_not_linked");
    expect(cookie).not.toContain("session_token");
    expect(await providersOf(userId)).toEqual(["credential"]);
  });

  it("si el usuario cancela en GitHub vuelve al login con el error", async () => {
    const { location, cookie } = await finishGithub(await startGithub(), "access_denied");
    expect(location).toBe("/login?error=access_denied");
    expect(cookie).not.toContain("session_token");
  });
});

describe("conectar GitHub desde el perfil", () => {
  it("se puede conectar un GitHub con otro email y luego entrar con él", async () => {
    const userId = await createPasswordUser("perfil@gh.test", true);
    githubUser = { id: 4004, login: "perfil", name: null, email: "otro-email@gh.test", verified: true };

    const linked = await finishGithub(
      await startGithub({ cookie: await login("perfil@gh.test"), callbackURL: "/perfil", errorCallbackURL: "/perfil" }),
    );
    expect(linked.location).toBe("/perfil");
    expect(await providersOf(userId)).toEqual(["credential", "github"]);

    const signedIn = await finishGithub(await startGithub());
    expect((await me(signedIn.cookie)).id).toBe(userId);
  });

  it("no se puede conectar un GitHub que ya usa otro usuario", async () => {
    const userId = await createPasswordUser("segundo@gh.test", true);
    githubUser = { id: 4004, login: "perfil", name: null, email: "otro-email@gh.test", verified: true };

    const { location } = await finishGithub(
      await startGithub({ cookie: await login("segundo@gh.test"), callbackURL: "/perfil", errorCallbackURL: "/perfil" }),
    );
    expect(location).toBe("/perfil?error=account_already_linked_to_different_user");
    expect(await providersOf(userId)).toEqual(["credential"]);
    expect(await db.$count(account, and(eq(account.providerId, "github"), eq(account.accountId, "4004")))).toBe(1);
  });

  it("se desconecta con el id de la cuenta que devuelve list-accounts", async () => {
    const cookie = await login("perfil@gh.test");
    const github = (await listAccounts(cookie)).find((a) => a.providerId === "github")!;
    const res = await unlink(cookie, github.id);
    expect(res.status).toBe(200);
    expect((await listAccounts(cookie)).map((a) => a.providerId)).toEqual(["credential"]);
  });

  it("quien solo entra con GitHub no puede desconectarlo", async () => {
    const { cookie } = await finishGithub(await startGithub());
    const [github] = await listAccounts(cookie);
    const res = await unlink(cookie, github!.id);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "FAILED_TO_UNLINK_LAST_ACCOUNT" });
  });
});
