"use client";

import { useState } from "react";
import { BillingReportsPanel } from "@/components/billing-reports-panel";
import { ClinicalReportsPanel } from "@/components/clinical-reports-panel";

type ReportTab = "facturacion" | "clinica";

const TAB_ACTIVE =
  "rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm transition-colors";
const TAB_INACTIVE =
  "rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900";

export function ReportsHub() {
  const [activeReport, setActiveReport] = useState<ReportTab>("facturacion");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Centro de reportes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Elegí el reporte que necesitás: facturación (caja) o atención clínica (consultorio).
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Submenú de reportes"
          className="inline-flex gap-1 rounded-xl bg-slate-100 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeReport === "facturacion"}
            onClick={() => setActiveReport("facturacion")}
            className={activeReport === "facturacion" ? TAB_ACTIVE : TAB_INACTIVE}
          >
            Facturación
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeReport === "clinica"}
            onClick={() => setActiveReport("clinica")}
            className={activeReport === "clinica" ? TAB_ACTIVE : TAB_INACTIVE}
          >
            Atención clínica
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-300">
        {activeReport === "facturacion" ? <BillingReportsPanel /> : <ClinicalReportsPanel />}
      </div>
    </div>
  );
}
