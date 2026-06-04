/** Mensajes amigables para errores de Supabase Auth. */
export function mapSupabaseAuthError(message: string, status?: number): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || status === 400) {
    return "El correo electrónico o la contraseña son incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de ingresar.";
  }
  if (m.includes("user not found")) {
    return "No existe un usuario con ese correo.";
  }
  if (m.includes("too many requests") || status === 429) {
    return "Demasiados intentos fallidos. Intenta de nuevo más tarde.";
  }
  if (m.includes("invalid email")) {
    return "El formato del correo electrónico no es válido.";
  }
  return message || "Ocurrió un error inesperado al intentar ingresar.";
}
