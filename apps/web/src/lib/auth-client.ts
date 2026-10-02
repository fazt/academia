import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Better Auth en el mismo origen: /api/auth (proxyado a la API). */
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", required: false, input: false },
        headline: { type: "string", required: false, input: false },
        bio: { type: "string", required: false, input: false },
      },
    }),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;

export type SessionUser = NonNullable<ReturnType<typeof useSession>["data"]>["user"];
