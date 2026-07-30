"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LogOut, Settings, Users, ClipboardList } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "Pacientes", match: "patients" as const, icon: Users },
  { href: "/novedades", label: "Novedades", match: "novedades" as const, icon: ClipboardList },
  { href: "/admin/reports", label: "Reportes", match: "reports" as const, icon: BarChart3 },
  { href: "/admin", label: "Configuración", match: "admin" as const, icon: Settings },
];

function isActive(pathname: string, match: (typeof NAV_ITEMS)[number]["match"]) {
  if (match === "patients") return pathname === "/";
  if (match === "reports") return pathname.startsWith("/admin/reports");
  if (match === "admin") return pathname === "/admin";
  if (match === "novedades") return pathname.startsWith("/novedades");
  return false;
}

function navLinkClass(active: boolean) {
  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
  if (active) {
    return `${base} bg-indigo-50 text-indigo-600`;
  }
  return `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    if (!isSupabaseConfigured() || !user) return;

    const supabase = getSupabaseClient();

    const fetchCount = async () => {
      const { count, error } = await supabase
        .from("novedades")
        .select("*", { count: "exact", head: true })
        .eq("estado", "PENDIENTE");
      if (!error && count !== null) {
        setPendingCount(count);
      }
    };

    void fetchCount();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel("novedades-sidebar-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "novedades" },
        () => {
          void fetchCount();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white no-print"
      aria-label="Barra lateral de navegación"
    >
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg shadow-sm">
          🦷
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-slate-900">
            Hospital Odontológico
          </p>
          <p className="truncate text-xs text-slate-500">Portal clínico</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.match);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={navLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.match === "novedades" && pendingCount > 0 && (
                    <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white ring-2 ring-white shadow-sm shadow-amber-100">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User & logout */}
      {user && (
        <div className="shrink-0 border-t border-slate-200 p-4">
          <div className="mb-3 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Sesión activa
            </p>
            <p
              className="mt-0.5 truncate text-sm font-medium text-slate-900"
              title={user.email ?? undefined}
            >
              {user.email ?? "aveira@odn.unne.edu.ar"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>
      )}
    </aside>
  );
}
