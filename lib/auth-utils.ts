import type { User } from "@supabase/supabase-js";
import type { NovedadUsuario } from "@/types";

export function getUserDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (typeof meta?.full_name === "string" && meta.full_name.trim()) {
    return meta.full_name.trim();
  }
  if (typeof meta?.nombre === "string" && meta.nombre.trim()) {
    return meta.nombre.trim();
  }
  if (user.email) {
    const local = user.email.split("@")[0] ?? user.email;
    return local.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Usuario";
}

export function toNovedadUsuario(user: User): NovedadUsuario {
  return {
    id: user.id,
    nombre: getUserDisplayName(user)
  };
}
