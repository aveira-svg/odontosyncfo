"use client";

import { useEffect, useState } from "react";
import { X, ClipboardPlus, Settings } from "lucide-react";
import { getCategorias } from "@/lib/novedades-service";
import { formatCategoriaNombre } from "@/lib/novedades-utils";
import type { CategoriaNovedad, CreateNovedadInput } from "@/types";
import { CategoriasConfigModal } from "./categorias-config-modal";

type NovedadFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateNovedadInput) => Promise<void>;
  isSubmitting: boolean;
};

const EMPTY_FORM: CreateNovedadInput = {
  titulo: "",
  categoriaId: "",
  descripcion: "",
  expedienteNumero: "",
  expedienteFecha: "",
  consultorioBox: ""
};

export function NovedadFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}: NovedadFormModalProps) {
  const [form, setForm] = useState<CreateNovedadInput>(EMPTY_FORM);
  const [categories, setCategories] = useState<CategoriaNovedad[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadCategories(selectFirst = false) {
    setLoadingCats(true);
    try {
      const list = await getCategorias();
      setCategories(list);
      
      if (selectFirst && list.length > 0) {
        const defaultCat = list.find((c) => c.nombre.toUpperCase() === "OTRO") || list[0];
        if (defaultCat) {
          setForm((f) => ({ ...f, categoriaId: defaultCat.id }));
        }
      }
    } catch {
      setErrorMsg("No se pudieron cargar las categorías.");
    } finally {
      setLoadingCats(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setErrorMsg("");
      void loadCategories(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCat = categories.find((c) => c.id === form.categoriaId);
  const showExpediente = selectedCat?.requiereExpediente === true;
  const showConsultorio = selectedCat?.requiereConsultorio === true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    
    if (!form.categoriaId) {
      setErrorMsg("Por favor, seleccioná una categoría.");
      return;
    }

    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="novedad-form-title"
      >
        <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
          
          {/* Mobile Pull Handle */}
          <div className="mx-auto h-1 w-12 rounded-full bg-slate-300 mb-2 sm:hidden shrink-0" />

          {/* Header */}
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ClipboardPlus className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="novedad-form-title" className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                  Nueva Novedad
                </h2>
                <p className="text-[10px] font-bold text-slate-400">
                  Registro en bitácora operativa
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95"
              aria-label="Cerrar formulario"
            >
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Form Content (Scrollable) */}
          <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 custom-scrollbar pb-1">
            
            {/* Title */}
            <div>
              <label htmlFor="novedad-titulo" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                Título <span className="text-rose-500">*</span>
              </label>
              <input
                id="novedad-titulo"
                type="text"
                className="input py-2.5 text-sm sm:text-xs"
                placeholder="Ej: Falta material en box 3"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                required
                autoFocus
              />
            </div>

            {/* Category selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="novedad-categoria" className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Categoría <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsManageOpen(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-indigo-600 hover:text-indigo-700 transition-colors py-0.5 px-1"
                >
                  <Settings className="h-3 w-3" />
                  Administrar
                </button>
              </div>
              
              <select
                id="novedad-categoria"
                className="input bg-white py-2.5 text-sm sm:text-xs"
                value={form.categoriaId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    categoriaId: e.target.value,
                    expedienteNumero: "",
                    expedienteFecha: "",
                    consultorioBox: ""
                  }))
                }
                required
                disabled={loadingCats}
              >
                <option value="" disabled>Seleccioná una categoría...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {formatCategoriaNombre(cat.nombre)}
                  </option>
                ))}
              </select>
            </div>

            {/* Expediente fields (conditional) */}
            {showExpediente && (
              <div className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 sm:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label htmlFor="novedad-exp-num" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">
                    Nº Expediente <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="novedad-exp-num"
                    type="text"
                    className="input bg-white py-2 text-sm sm:text-xs"
                    placeholder="Ej: EXP-2026-0042"
                    value={form.expedienteNumero ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, expedienteNumero: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="novedad-exp-fecha" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">
                    Fecha Expediente <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="novedad-exp-fecha"
                    type="date"
                    className="input bg-white py-2 text-sm sm:text-xs"
                    value={form.expedienteFecha ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, expedienteFecha: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}

            {/* Consultorio Box fields (conditional) */}
            {showConsultorio && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 animate-in slide-in-from-top-2 duration-200">
                <label htmlFor="novedad-box" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                  Consultorio / Box <span className="text-rose-500">*</span>
                </label>
                <input
                  id="novedad-box"
                  type="text"
                  className="input bg-white py-2 text-sm sm:text-xs"
                  placeholder="Ej: Box 2 — Clínica Adultos"
                  value={form.consultorioBox ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, consultorioBox: e.target.value }))}
                  required
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="novedad-descripcion" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                Descripción
              </label>
              <textarea
                id="novedad-descripcion"
                className="input min-h-[80px] sm:min-h-[88px] resize-y py-2.5 text-sm sm:text-xs"
                placeholder="Detalle adicional de la novedad..."
                value={form.descripcion ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Error display */}
            {errorMsg && (
              <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700" role="alert">
                {errorMsg}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5 shrink-0">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1 sm:flex-none" disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Registrar Novedad"}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Configuración de Categorías Modal */}
      <CategoriasConfigModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        onCategoriesChanged={() => void loadCategories(false)}
      />
    </>
  );
}
