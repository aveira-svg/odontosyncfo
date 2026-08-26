"use client";

import { useEffect, useState } from "react";
import { X, Settings, PlusCircle, Trash2, ShieldAlert } from "lucide-react";
import type { CategoriaNovedad } from "@/types";
import {
  getCategorias,
  createCategoria,
  deleteCategoria
} from "@/lib/novedades-service";
import { formatCategoriaNombre } from "@/lib/novedades-utils";

type CategoriasConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: () => void;
};

export function CategoriasConfigModal({
  isOpen,
  onClose,
  onCategoriesChanged
}: CategoriasConfigModalProps) {
  const [categorias, setCategorias] = useState<CategoriaNovedad[]>([]);
  const [nombre, setNombre] = useState("");
  const [requiereExpediente, setRequiereExpediente] = useState(false);
  const [requiereConsultorio, setRequiereConsultorio] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadCategorias() {
    setLoading(true);
    setErrorMsg("");
    try {
      const list = await getCategorias();
      setCategorias(list);
    } catch {
      setErrorMsg("No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      void loadCategorias();
      setNombre("");
      setRequiereExpediente(false);
      setRequiereConsultorio(false);
      setErrorMsg("");
      setSuccessMsg("");
      setDeletingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await createCategoria(
        nombre.trim(),
        requiereExpediente,
        requiereConsultorio
      );
      setNombre("");
      setRequiereExpediente(false);
      setRequiereConsultorio(false);
      setSuccessMsg("Categoría creada con éxito.");
      await loadCategorias();
      onCategoriesChanged();
    } catch (err) {
      setErrorMsg((err as Error).message || "Error al crear la categoría.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    setDeletingId(id);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await deleteCategoria(id);
      setSuccessMsg("Categoría eliminada con éxito.");
      await loadCategorias();
      onCategoriesChanged();
    } catch (err) {
      setErrorMsg((err as Error).message || "Error al eliminar la categoría.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="categorias-config-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        
        {/* Mobile Pull Handle */}
        <div className="mx-auto h-1 w-12 rounded-full bg-slate-300 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Settings className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="categorias-config-title" className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Administrar Categorías
              </h2>
              <p className="text-[10px] font-bold text-slate-400">
                Gestión de etiquetas y requerimientos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95"
            aria-label="Cerrar panel de categorías"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-4 custom-scrollbar pb-1">
          
          {/* Add Category Form */}
          <form onSubmit={(e) => void handleAddCategory(e)} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <PlusCircle className="h-4 w-4 text-emerald-600" />
              Nueva Categoría
            </h3>
            
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="cat-nombre" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Nombre de Categoría <span className="text-rose-500">*</span>
                </label>
                <input
                  id="cat-nombre"
                  type="text"
                  className="input bg-white py-2 text-sm sm:text-xs"
                  placeholder="Ej: INSUMOS, LIMPIEZA, MANTENIMIENTO..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                <input
                  id="cat-req-exp"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={requiereExpediente}
                  onChange={(e) => setRequiereExpediente(e.target.checked)}
                />
                <label htmlFor="cat-req-exp" className="text-[10px] font-bold uppercase tracking-wide text-slate-700 cursor-pointer select-none">
                  Requiere Expediente
                </label>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                <input
                  id="cat-req-box"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={requiereConsultorio}
                  onChange={(e) => setRequiereConsultorio(e.target.checked)}
                />
                <label htmlFor="cat-req-box" className="text-[10px] font-bold uppercase tracking-wide text-slate-700 cursor-pointer select-none">
                  Requiere Box / Cons.
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="btn btn-primary w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                disabled={submitting}
              >
                {submitting ? "Guardando..." : "Agregar Categoría"}
              </button>
            </div>
          </form>

          {/* Feedback Messages */}
          {errorMsg && (
            <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700" role="alert">
              {successMsg}
            </p>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Categorías Existentes ({categorias.length})
            </h3>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
              </div>
            ) : categorias.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No hay categorías registradas.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden" role="list">
                {categorias.map((cat) => (
                  <li key={cat.id} className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-slate-50/50">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 font-mono truncate">
                        {formatCategoriaNombre(cat.nombre)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {cat.requiereExpediente && (
                          <span className="inline-flex rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700 border border-indigo-100">
                            Expediente
                          </span>
                        )}
                        {cat.requiereConsultorio && (
                          <span className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 border border-amber-100">
                            Box / Cons.
                          </span>
                        )}
                        {!cat.requiereExpediente && !cat.requiereConsultorio && (
                          <span className="inline-flex rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Sin restricciones
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDeleteCategory(cat.id)}
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 active:scale-95"
                      disabled={deletingId !== null}
                      title="Eliminar categoría"
                      aria-label={`Eliminar categoría ${cat.nombre}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5 text-amber-800 text-[11px] font-medium leading-relaxed">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              <strong>Atención:</strong> Si eliminás una categoría en uso, las novedades vinculadas mantendrán su nombre histórico como texto estático de seguridad para evitar pérdida de trazabilidad.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-3 border-t border-slate-100 pt-3 flex justify-end shrink-0">
          <button type="button" onClick={onClose} className="btn btn-secondary w-full sm:w-auto">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
