"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { LoginView } from "@/components/login-view";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/50 p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-200 animate-pulse">
            <span className="text-3xl animate-bounce duration-1000">🦷</span>
            <div className="absolute inset-0 rounded-2xl border border-white/20"></div>
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Hospital Odontológico
            </h1>
            <p className="text-3xs font-bold uppercase tracking-wider text-slate-400 mt-1.5 animate-pulse">
              Cargando portal clínico...
            </p>
          </div>
          <div className="mt-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
