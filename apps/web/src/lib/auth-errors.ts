const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email o contraseña incorrectos",
  EMAIL_NOT_VERIFIED: "Confirma tu email antes de iniciar sesión",
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese email",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese email",
  PASSWORD_TOO_SHORT: "La contraseña es demasiado corta",
  PASSWORD_TOO_LONG: "La contraseña es demasiado larga",
  INVALID_PASSWORD: "La contraseña actual no es correcta",
  INVALID_TOKEN: "El enlace no es válido o ha caducado",
  TOKEN_EXPIRED: "El enlace ha caducado",
  INVALID_EMAIL: "Email no válido",
  TOO_MANY_REQUESTS: "Demasiados intentos. Espera un momento y vuelve a probar",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "Crea una contraseña antes de desconectar Google",
  SESSION_NOT_FRESH: "Por seguridad, cierra sesión, vuelve a entrar e inténtalo de nuevo",
};

/** Códigos que Better Auth añade como ?error= al volver de Google. */
const OAUTH_MESSAGES: Record<string, string> = {
  access_denied: "Cancelaste el acceso con Google",
  account_not_linked:
    "Ya existe una cuenta con este email, pero aún no está confirmada. Confírmala con el enlace que te enviamos (o entra con tu contraseña para pedir otro) y después podrás usar Google.",
  email_not_verified: "Confirma tu email antes de entrar: te enviamos un enlace",
  email_does_not_match: "Esa cuenta de Google tiene otro email. Elige la que usa el mismo email que tu perfil",
  account_already_linked_to_different_user: "Esa cuenta de Google ya está conectada a otro usuario",
};

export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined) {
  if (!error) return "Algo salió mal";
  if (error.status === 429) return MESSAGES.TOO_MANY_REQUESTS!;
  return (error.code && MESSAGES[error.code]) || error.message || "Algo salió mal";
}

export function oauthErrorMessage(code: string) {
  return OAUTH_MESSAGES[code] ?? "No se pudo completar el acceso con Google. Inténtalo de nuevo";
}

/** Solo admite redirecciones internas (evita open redirects con ?redirect=https://...). */
export function safeRedirect(value: string | null | undefined, fallback = "/mis-cursos") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
