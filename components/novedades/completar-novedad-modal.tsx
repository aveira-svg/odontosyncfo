"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import type { Novedad } from "@/types";
import { formatCategoriaNombre } from "@/lib/novedades-utils";

type CompletarNovedadModalProps = {
  novedad: Novedad | null;
  onClose: () => void;
  onConfirm: (notasCierre: string) => Promise<void>;
  isSubmitting: boolean;
};

export function CompletarNovedadModal({
  novedad,
  onClose,
  onConfirm,
  isSubmitting
}: CompletarNovedadModalProps) {
  const [notasCierre, setNotasCierre] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (novedad) {
      setNotasCierre("");
      setErrorMsg("");
    }
  }, [novedad]);

  if (!novedad) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    try {
      await onConfirm(notasCierre);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completar-novedad-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        
        {/* Mobile Pull Handle */}
        <div className="mx-auto h-1 w-12 rounded-full bg-slate-300 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="completar-novedad-title" className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Marcar Completado
              </h2>
              <p className="text-[10px] font-bold text-slate-400">
                {formatCategoriaNombre(novedad.categoria?.nombre)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Novedad preview box */}
        <div className="mb-3 rounded-xl bg-slate-50 border border-slate-200/60 p-3 shrink-0">
          <p className="text-sm font-bold text-slate-900">{novedad.titulo}</p>
          {novedad.descripcion && (
            <p className="mt-1 text-xs text-slate-600 line-clamp-3">{novedad.descripcion}</p>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5 flex-1 overflow-y-auto">
          <div>
            <label htmlFor="notas-cierre" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              Notas de cierre (opcional)
            </label>
            <textarea
              id="notas-cierre"
              className="input min-h-[76px] resize-y py-2.5 text-sm sm:text-xs"
              placeholder="Detalle o resolución de la novedad..."
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>

          {errorMsg && (
            <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">
              {errorMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 shrink-0">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 sm:flex-none" disabled={isSubmitting}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn flex-1 sm:flex-none bg-emerald-600 text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Completando..." : "Confirmar Resolución"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
