"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPasante,
  deletePasante,
  getPasantes,
  setPasanteActivo
} from "@/lib/supabase-service";
import type { Pasante } from "@/types";

export function AdminPasantes() {
  const [items, setItems] = useState<Pasante[]>([]);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDni, setNewDni] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pasante | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await getPasantes());
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al cargar los pasantes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onToggle(id: string, activo: boolean) {
    try {
      await setPasanteActivo(id, activo);
      await load();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }

  async function onSubmitAdd(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!newDni.trim()) {
      setErrorMsg("Ingresá el DNI del pasante.");
      return;
    }
    if (!newNombre.trim()) {
      setErrorMsg("Ingresá el nombre completo del pasante.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createPasante({
        id: newDni,
        nombreCompleto: newNombre,
        telefono: newTelefono,
        activo: true
      });
      setSuccessMsg("Pasante agregado correctamente.");
      setNewDni("");
      setNewNombre("");
      setNewTelefono("");
      setShowAddForm(false);
      await load();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await deletePasante(deleteTarget.id);
      setSuccessMsg(`Se eliminó al pasante ${deleteTarget.nombreCompleto}.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setDeleteTarget(null);
    }
  }

  const filtered = useMemo(() => {
    const lower = term.toLowerCase();
    return items.filter(
      (p) =>
        p.nombreCompleto.toLowerCase().includes(lower) ||
        p.id.toLowerCase().includes(lower) ||
        (p.telefono && p.telefono.toLowerCase().includes(lower))
    );
  }, [items, term]);

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Pasantes</h2>
          <p className="text-xs text-slate-600 font-medium">
            Alta, baja y estado de pasantes para acompañamiento en atención clínica.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`btn text-xs font-bold ${showAddForm ? "btn-secondary" : "btn-primary"}`}
        >
          {showAddForm ? "Cancelar" : "+ Nuevo pasante"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={onSubmitAdd}
          className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4 md:grid-cols-4"
        >
          <div className="md:col-span-4 border-b border-blue-200/50 pb-1">
            <h3 className="text-sm font-extrabold text-blue-900">Agregar Pasante</h3>
          </div>
          
          <div className="md:col-span-1">
            <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-600">
              DNI (ID)
            </label>
            <input
              className="input bg-white"
              placeholder="Ej: 34567890"
              value={newDni}
              onChange={(e) => setNewDni(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-600">
              Nombre completo
            </label>
            <input
              className="input bg-white"
              placeholder="Ej: Gómez Juan Pablo"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-600">
              Teléfono
            </label>
            <input
              className="input bg-white"
              placeholder="Ej: 3794889900"
              value={newTelefono}
              onChange={(e) => setNewTelefono(e.target.value)}
            />
          </div>

          <div className="md:col-span-4 flex justify-end mt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-2 px-6"
            >
              {isSubmitting ? "Guardando..." : "Guardar Pasante"}
            </button>
          </div>
        </form>
      )}

      {errorMsg && <p className="text-xs font-bold text-red-600">{errorMsg}</p>}
      {successMsg && <p className="text-xs font-bold text-green-600">{successMsg}</p>}

      <input
        className="input max-w-md bg-slate-50/50"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar por DNI, nombre o teléfono..."
      />

      {loading && <p className="animate-pulse text-sm text-slate-500 font-semibold">Cargando...</p>}

      <div className="space-y-3">
        {filtered.length === 0 && !loading ? (
          <p className="py-6 text-center text-sm text-slate-500 font-medium">
            No hay pasantes registrados que coincidan con la búsqueda.
          </p>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <div>
                <p className="font-bold text-slate-800">{p.nombreCompleto}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  <span className="font-mono text-3xs text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">DNI: {p.id}</span>
                  {p.telefono && (
                    <span className="text-3xs text-slate-600 font-semibold">📞 Tel: {p.telefono}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                    p.activo
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {p.activo ? "Activo" : "No Activo"}
                </span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={p.activo}
                    onChange={(e) => onToggle(p.id, e.target.checked)}
                    className="peer sr-only"
                    title={p.activo ? "Desactivar" : "Activar"}
                  />
                  <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(p)}
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-3xs font-extrabold text-red-600 transition-colors hover:bg-red-100/80"
                  title="Eliminar del catálogo"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-800">Eliminar pasante</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-700 font-medium">
              ¿Eliminar al pasante <strong>{deleteTarget.nombreCompleto}</strong> (DNI: {deleteTarget.id})? Los registros
              históricos que ya lo referencian no se modifican.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary px-4 py-2 text-3xs font-extrabold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void onConfirmDelete()}
                className="btn bg-red-600 px-4 py-2 text-3xs font-extrabold text-white hover:bg-red-700"
              >
                Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
