"use client";

import { useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { mapSupabaseAuthError } from "@/lib/auth-errors";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setErrorMsg("Error: Supabase no está configurado. Revisá NEXT_PUBLIC_SUPABASE_* en .env.local");
      return;
    }

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });
      if (error) {
        setErrorMsg(mapSupabaseAuthError(error.message, error.status));
      }
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setErrorMsg("Ocurrió un error inesperado al intentar ingresar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-4 md:p-8">
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl"></div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="card border border-white/60 bg-white/80 p-6 md:p-8 shadow-xl shadow-slate-100 backdrop-blur-lg">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-150 mb-3">
              <span className="text-2xl">🦷</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
              Bienvenido a{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Hospital Odontológico
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa tus credenciales para acceder a la gestión clínica.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                Correo electrónico
              </label>
              <input
                type="email"
                className="input bg-white/70"
                placeholder="ejemplo@hospitalodontologico.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                Contraseña
              </label>
              <input
                type="password"
                className="input bg-white/70"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-800 animate-in shake duration-300">
                <div className="flex items-center gap-1.5">
                  <span>⚠️</span>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-xs font-bold shadow-md shadow-blue-100 mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                <span>🔑 Ingresar al sistema</span>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-4xs font-bold uppercase tracking-wider text-slate-400">
              Sistema de Seguridad Profesional
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
