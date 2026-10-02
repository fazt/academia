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
  FAILED_TO_UNLINK_LAST_ACCOUNT: "No puedes desconectar tu único método de acceso. Crea antes una contraseña",
  SESSION_NOT_FRESH: "Por seguridad, cierra sesión, vuelve a entrar e inténtalo de nuevo",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Esa cuenta ya está conectada",
};

/** Códigos que Better Auth añade como ?error= al volver de un proveedor (login y perfil). */
const OAUTH_MESSAGES: Record<string, string> = {
  access_denied: "Cancelaste el inicio de sesión",
  account_not_linked:
    "Ya hay una cuenta con este email. Entra con tu email y contraseña (si aún no lo confirmaste, usa antes el enlace que te enviamos) y conecta este acceso desde tu perfil.",
  email_not_verified: "Te enviamos un enlace para confirmar tu email. Ábrelo y después podrás entrar.",
  email_not_found: "Esa cuenta no tiene un email que podamos usar. Prueba con otra o regístrate con tu email.",
  unable_to_link_account: "No se pudo conectar la cuenta. Comprueba que su email esté verificado y vuelve a intentarlo.",
  account_already_linked_to_different_user: "Esa cuenta ya está conectada a otro usuario.",
};

export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined) {
  if (!error) return "Algo salió mal";
  if (error.status === 429) return MESSAGES.TOO_MANY_REQUESTS!;
  return (error.code && MESSAGES[error.code]) || error.message || "Algo salió mal";
}

export function oauthErrorMessage(code: string) {
  if (code.startsWith("state_") || code === "please_restart_the_process") {
    return "La solicitud caducó. Vuelve a intentarlo.";
  }
  return OAUTH_MESSAGES[code] ?? "No se pudo completar el inicio de sesión. Inténtalo de nuevo.";
}

/** Solo admite redirecciones internas (evita open redirects con ?redirect=https://...). */
export function safeRedirect(value: string | null | undefined, fallback = "/mis-cursos") {
  // "/\evil.com" también vale: los navegadores tratan "\" como "/" y lo convierten en "//evil.com".
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
