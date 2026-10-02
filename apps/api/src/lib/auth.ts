import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { account, session, user, verification } from "../db/schema";
import { env, isProd } from "../env";
import { emails, sendEmail } from "./email";

export const auth = betterAuth({
  appName: "Academia",
  // Origen público: los enlaces de los emails deben apuntar a la web, no al host interno de la API.
  baseURL: env.APP_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...emails.resetPassword(user.name, url) });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...emails.verifyEmail(user.name, url) });
    },
  },
  user: {
    additionalFields: {
      // input: false -> nadie puede asignarse un rol, un titular o una bio desde los endpoints de Better Auth.
      role: { type: "string", required: false, defaultValue: "student", input: false },
      headline: { type: "string", required: false, defaultValue: "", input: false },
      bio: { type: "string", required: false, defaultValue: "", input: false },
    },
  },
  advanced: {
    useSecureCookies: isProd,
    ipAddress: {
      // Detrás del proxy de Next (dev) o del proxy de producción, la IP real viaja en estas cabeceras.
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  rateLimit: {
    enabled: isProd,
    window: 60,
    max: 100,
  },
});

export type AuthSession = typeof auth.$Infer.Session.session;
export type AuthUser = typeof auth.$Infer.Session.user;
