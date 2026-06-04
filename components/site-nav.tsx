"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", match: "home" as const },
  { href: "/admin", label: "Configuración", match: "admin" as const },
  { href: "/admin/reports", label: "Reportes", match: "reports" as const }
];

function isActive(pathname: string, match: (typeof NAV_ITEMS)[number]["match"]) {
  if (match === "home") return pathname === "/";
  if (match === "reports") return pathname.startsWith("/admin/reports");
  if (match === "admin") return pathname === "/admin";
  return false;
}

function navLinkClass(active: boolean, match: (typeof NAV_ITEMS)[number]["match"]) {
  const base = "px-3 py-1.5 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all duration-200";
  const colors: Record<string, string> = {
    home: "bg-blue-600 text-white shadow-blue-100 ring-blue-600/20",
    admin: "bg-green-600 text-white shadow-green-100 ring-green-600/20",
    reports: "bg-purple-600 text-white shadow-purple-100 ring-purple-600/20"
  };
  if (active) {
    return `${base} ${colors[match] ?? "bg-blue-600 text-white"} shadow-sm`;
  }
  return `${base} bg-slate-100 text-slate-600 border border-slate-200/30 hover:bg-slate-200/60 hover:text-slate-800`;
}

export function SiteNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <nav className="flex items-center gap-2" aria-label="Navegación principal">
      <div className="flex items-center gap-1.5 mr-1 no-print">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(active, item.match)}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 ml-1 no-print">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-0.5">
              Usuario
            </span>
            <span
              className="text-[11px] font-bold text-slate-600 font-mono truncate max-w-[180px]"
              title={user.email || ""}
            >
              {user.email}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="px-3 py-1.5 text-xs font-extrabold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/50 border border-red-100 rounded-lg transition-all duration-250 active:scale-[0.97]"
            title="Cerrar sesión"
          >
            🚪 <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      )}
    </nav>
  );
}
