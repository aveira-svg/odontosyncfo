"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LogOut,
  Settings,
  Users,
  ClipboardList,
  Menu,
  X,
  Bell,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/", label: "Pacientes", match: "patients" as const, icon: Users },
  { href: "/novedades", label: "Novedades", match: "novedades" as const, icon: ClipboardList },
  { href: "/admin/reports", label: "Reportes", match: "reports" as const, icon: BarChart3 },
  { href: "/admin/analytics", label: "Estadísticas", match: "analytics" as const, icon: TrendingUp },
  { href: "/admin", label: "Configuración", match: "admin" as const, icon: Settings },
];

function isActive(pathname: string, match: (typeof NAV_ITEMS)[number]["match"]) {
  if (match === "patients") return pathname === "/";
  if (match === "reports") return pathname.startsWith("/admin/reports");
  if (match === "analytics") return pathname.startsWith("/admin/analytics") || pathname.startsWith("/estadisticas");
  if (match === "admin") return pathname === "/admin";
  if (match === "novedades") return pathname.startsWith("/novedades");
  return false;
}

function navLinkClass(active: boolean) {
  const base =
    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
  if (active) {
    return `${base} bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50`;
  }
  return `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/60`;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

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

  const navContent = (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        <ul className="space-y-1.5" role="list">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.match);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={navLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.match === "novedades" && pendingCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white ring-2 ring-white shadow-sm shadow-amber-100 animate-pulse">
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
        <div className="shrink-0 border-t border-slate-200 bg-slate-50/50 p-4">
          <div className="mb-3 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Sesión activa
            </p>
            <p
              className="mt-0.5 truncate text-xs font-semibold text-slate-800"
              title={user.email ?? undefined}
            >
              {user.email ?? "aveira@odn.unne.edu.ar"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/60 bg-rose-50/70 px-3 py-2.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 hover:text-rose-800 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* MOBILE TOP BAR (Smartphones & Tablets < lg) */}
      <header className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3.5 backdrop-blur-md lg:hidden no-print">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm shadow-sm shadow-indigo-200 shrink-0">
            🦷
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold leading-tight text-slate-900">
              Hospital Odontológico
            </p>
            <p className="truncate text-[10px] font-medium text-slate-500">Portal clínico</p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          {pathname !== "/novedades" && pendingCount > 0 && (
            <Link
              href="/novedades"
              className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/60 px-2 py-1 text-[10px] font-bold text-amber-700 animate-pulse"
              title="Novedades pendientes"
            >
              <Bell className="h-3 w-3" />
              <span>{pendingCount}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
            aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER BACKDROP & SHEET */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm shadow-sm">
                  🦷
                </span>
                <p className="text-xs font-extrabold text-slate-900">Hospital Odontológico</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar menú lateral"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation and session */}
            {navContent}
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR (Screens >= lg) */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex no-print"
        aria-label="Barra lateral de navegación"
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg shadow-sm shadow-indigo-200">
            🦷
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold leading-tight text-slate-900">
              Hospital Odontológico
            </p>
            <p className="truncate text-xs font-medium text-slate-500">Portal clínico</p>
          </div>
        </div>

        {/* Navigation and session */}
        {navContent}
      </aside>
    </>
  );
}
