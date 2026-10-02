import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { account, session, user, verification } from "../db/schema";
import { env, isProd } from "../env";
import { emails, sendEmail } from "./email";

/** Cada proveedor se activa solo con su ID y su secreto; la web oculta los botones de los demás. */
export const socialProvidersEnabled = {
  google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  github: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  microsoft: !!(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
};

/**
 * El claim `email` de Entra ID lo puede editar el admin de cualquier tenant (ataque nOAuth), así
 * que Better Auth lo marca como no verificado. Solo nos fiamos de él si el claim opcional
 * `xms_edov` confirma que el dominio del email está verificado: cuentas personales con el email
 * confirmado al crearlas o cuentas de trabajo de un dominio verificado por su organización.
 */
function microsoftEmailVerified(profile: Record<string, unknown>) {
  return profile.xms_edov === true || profile.xms_edov === "true";
}

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
  // Los callbacks son <APP_URL>/api/auth/callback/<proveedor>: pasan por la web, como el resto de /api.
  // En los tres, como con email y contraseña, sin email verificado no hay sesión
  // (requireEmailVerification): se crea la cuenta y se envía el enlace de confirmación.
  socialProviders: {
    ...(socialProvidersEnabled.google && {
      google: {
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        // Deja elegir cuenta aunque solo haya una sesión de Google abierta en el navegador.
        prompt: "select_account",
        requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
      },
    }),
    ...(socialProvidersEnabled.github && {
      github: {
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
        requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
      },
    }),
    ...(socialProvidersEnabled.microsoft && {
      microsoft: {
        clientId: env.MICROSOFT_CLIENT_ID!,
        clientSecret: env.MICROSOFT_CLIENT_SECRET!,
        tenantId: env.MICROSOFT_TENANT_ID,
        // Deja elegir cuenta aunque haya una sesión de Microsoft abierta en el navegador.
        prompt: "select_account",
        // Solo la identidad: sin User.Read ni offline_access no hay acceso a Graph ni refresh token.
        disableDefaultScope: true,
        scope: ["openid", "profile", "email"],
        // La foto vendría de Graph como data URL; el avatar se sube desde el perfil.
        disableProfilePhoto: true,
        mapProfileToUser: (profile) => (microsoftEmailVerified(profile) ? { emailVerified: true } : {}),
        requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
      },
    }),
  },
  account: {
    // No usamos los tokens de los proveedores para nada, pero si se filtra la base no deben servir.
    encryptOAuthTokens: true,
    accountLinking: {
      // Entrar con un proveedor en una cuenta existente del mismo email la vincula solo si los dos
      // emails están verificados. Así nadie puede registrar antes el email de otro con una
      // contraseña suya y quedarse con la cuenta cuando el dueño entre con un proveedor.
      requireLocalEmailVerified: true,
      // Desde el perfil, con sesión iniciada, se puede conectar una cuenta con otro email.
      allowDifferentEmails: true,
    },
  },
  // Errores del flujo OAuth sin errorCallbackURL (p. ej. un state caducado): al login, con ?error=.
  onAPIError: { errorURL: `${env.APP_URL}/login` },
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
