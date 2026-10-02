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
};

/** Códigos que Better Auth añade como ?error= al volver de Microsoft (u otro proveedor). */
const OAUTH_MESSAGES: Record<string, string> = {
  access_denied: "Cancelaste el inicio de sesión",
  account_not_linked:
    "Ya hay una cuenta con este email. Entra con tu email y contraseña (si aún no la confirmaste, usa antes el enlace que te enviamos).",
  email_not_verified: "Te enviamos un enlace para confirmar tu email. Ábrelo y después podrás entrar.",
  email_not_found: "Tu cuenta no tiene un email asociado. Usa otra o regístrate con tu email.",
};

export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined) {
  if (!error) return "Algo salió mal";
  if (error.status === 429) return MESSAGES.TOO_MANY_REQUESTS!;
  return (error.code && MESSAGES[error.code]) || error.message || "Algo salió mal";
}

export function oauthErrorMessage(code: string) {
  return OAUTH_MESSAGES[code] ?? "No se pudo completar el inicio de sesión. Inténtalo de nuevo";
}

/** Solo admite redirecciones internas (evita open redirects con ?redirect=https://...). */
export function safeRedirect(value: string | null | undefined, fallback = "/mis-cursos") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
