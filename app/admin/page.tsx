"use client";

import { useState } from "react";
import { AdminAranceles } from "@/components/admin-aranceles";
import { AdminProfesionales } from "@/components/admin-profesionales";
import { AdminPasantes } from "@/components/admin-pasantes";
import { AdminPracticas } from "@/components/admin-practicas";

type TabId = "profesionales" | "aranceles" | "practicas" | "pasantes";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profesionales");

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-4">
      {/* Page Header */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
        <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-800 uppercase">
          ⚙️ Configuración / Administración
        </h1>
        <p className="text-[10px] sm:text-3xs text-slate-400 font-bold uppercase tracking-wider leading-none">
          Gestioná profesionales, aranceles y prácticas clínicas de manera organizada.
        </p>
      </div>

      {/* Modern Premium Tabs Control */}
      <div className="flex border-b border-slate-200/80 gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
        <button
          type="button"
          onClick={() => setActiveTab("profesionales")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all duration-300 active:scale-[0.98] ${
            activeTab === "profesionales"
              ? "bg-green-50 text-green-700 border border-green-200/60 shadow-sm ring-2 ring-green-600/5"
              : "bg-transparent text-slate-500 hover:bg-slate-50/80 hover:text-slate-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Profesionales
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pasantes")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all duration-300 active:scale-[0.98] ${
            activeTab === "pasantes"
              ? "bg-green-50 text-green-700 border border-green-200/60 shadow-sm ring-2 ring-green-600/5"
              : "bg-transparent text-slate-500 hover:bg-slate-50/80 hover:text-slate-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Pasantes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("aranceles")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all duration-300 active:scale-[0.98] ${
            activeTab === "aranceles"
              ? "bg-green-50 text-green-700 border border-green-200/60 shadow-sm ring-2 ring-green-600/5"
              : "bg-transparent text-slate-500 hover:bg-slate-50/80 hover:text-slate-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Catálogo de Aranceles
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("practicas")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all duration-300 active:scale-[0.98] ${
            activeTab === "practicas"
              ? "bg-green-50 text-green-700 border border-green-200/60 shadow-sm ring-2 ring-green-600/5"
              : "bg-transparent text-slate-500 hover:bg-slate-50/80 hover:text-slate-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Prácticas Clínicas
        </button>

      </div>

      {/* Tab Panel Content with premium smooth transition wrapper */}
      <div className="bg-slate-50/30 rounded-2xl p-1 md:p-3 transition-opacity duration-300 animate-fadeIn">
        {activeTab === "profesionales" && (
          <div className="animate-fadeIn">
            <AdminProfesionales />
          </div>
        )}
        {activeTab === "pasantes" && (
          <div className="animate-fadeIn">
            <AdminPasantes />
          </div>
        )}
        {activeTab === "aranceles" && (
          <div className="animate-fadeIn">
            <AdminAranceles />
          </div>
        )}
        {activeTab === "practicas" && (
          <div className="animate-fadeIn">
            <AdminPracticas />
          </div>
        )}
      </div>
    </div>
  );
}
