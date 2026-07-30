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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completar-novedad-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <div>
              <h2 id="completar-novedad-title" className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Marcar Completado
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {formatCategoriaNombre(novedad.categoria?.nombre)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">{novedad.titulo}</p>
          {novedad.descripcion && (
            <p className="mt-1 text-xs text-slate-600">{novedad.descripcion}</p>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="notas-cierre" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              Notas de cierre (opcional)
            </label>
            <textarea
              id="notas-cierre"
              className="input min-h-[72px] resize-y"
              placeholder="Observaciones al dar por resuelta la novedad..."
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
              rows={3}
            />
          </div>

          {errorMsg && (
            <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Completando..." : "Marcar Visto / Completado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
