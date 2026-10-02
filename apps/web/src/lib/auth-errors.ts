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
  FAILED_TO_UNLINK_LAST_ACCOUNT: "No puedes desconectar tu único método de acceso",
  SESSION_NOT_FRESH: "Por seguridad, cierra sesión y vuelve a entrar antes de hacer este cambio",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Esa cuenta de GitHub ya está conectada",
};

/** Códigos con los que Better Auth vuelve de GitHub en ?error= (login y perfil). */
const OAUTH_MESSAGES: Record<string, string> = {
  access_denied: "Cancelaste el acceso con GitHub.",
  account_not_linked:
    "Ya hay una cuenta con el email de tu GitHub. Entra con tu email y contraseña (confírmalo si aún no lo hiciste) y conecta GitHub desde tu perfil.",
  email_not_found: "Tu cuenta de GitHub no tiene ningún email que podamos usar.",
  email_not_verified:
    "Tu email de GitHub no está verificado. Verifícalo en GitHub o usa el enlace de confirmación que te enviamos.",
  unable_to_link_account: "No se pudo conectar GitHub. Verifica tu email en GitHub y vuelve a intentarlo.",
  account_already_linked_to_different_user: "Esa cuenta de GitHub ya está conectada a otro usuario.",
  "email_doesn't_match": "El email de tu GitHub no coincide con el de tu cuenta.",
};

export function oauthErrorMessage(code: string) {
  if (code.startsWith("state_") || code === "please_restart_the_process") {
    return "La solicitud caducó. Vuelve a intentarlo.";
  }
  return OAUTH_MESSAGES[code] ?? "No se pudo completar el acceso con GitHub. Inténtalo de nuevo.";
}

export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined) {
  if (!error) return "Algo salió mal";
  if (error.status === 429) return MESSAGES.TOO_MANY_REQUESTS!;
  return (error.code && MESSAGES[error.code]) || error.message || "Algo salió mal";
}

/** Solo admite redirecciones internas (evita open redirects con ?redirect=https://...). */
export function safeRedirect(value: string | null | undefined, fallback = "/mis-cursos") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
