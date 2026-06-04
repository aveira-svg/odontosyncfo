"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createCatalogoPractica,
  deleteCatalogoPractica,
  getCatalogoPracticasClinicas,
  setCatalogoPracticaActiva
} from "@/lib/supabase-service";

type CatalogoPractica = { id: string; nombre: string; activo?: boolean };

export function AdminPracticas() {
  const [items, setItems] = useState<CatalogoPractica[]>([]);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogoPractica | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await getCatalogoPracticasClinicas());
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onToggle(id: string, activo: boolean) {
    try {
      await setCatalogoPracticaActiva(id, activo);
      await load();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  }

  async function onSubmitAdd(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!newNombre.trim()) {
      setErrorMsg("Ingresá el nombre completo de la práctica.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createCatalogoPractica({ nombre: newNombre });
      setSuccessMsg("Práctica clínica agregada correctamente.");
      setNewNombre("");
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
      await deleteCatalogoPractica(deleteTarget.id);
      setSuccessMsg(`Se eliminó la práctica "${deleteTarget.nombre}".`);
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
        p.nombre.toLowerCase().includes(lower) ||
        p.id.toLowerCase().includes(lower)
    );
  }, [items, term]);

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Prácticas Clínicas</h2>
          <p className="text-xs text-slate-500">
            Alta, baja y activación del catálogo de prácticas clínicas seleccionables en atención.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`btn text-xs font-semibold ${showAddForm ? "btn-secondary" : "btn-primary"}`}
        >
          {showAddForm ? "Cancelar" : "+ Nueva práctica"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={onSubmitAdd}
          className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-3 animate-fadeIn"
        >
          <div className="md:col-span-3 border-b border-blue-100/50 pb-1">
            <h3 className="text-sm font-semibold text-blue-900">Agregar Práctica Clínica</h3>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Nombre de la práctica
            </label>
            <input
              className="input bg-white"
              placeholder="Ej: EXODONCIAS COMPLEJAS"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex w-full items-center justify-center gap-2 py-2"
            >
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      )}

      {errorMsg && <p className="text-xs font-medium text-red-600">{errorMsg}</p>}
      {successMsg && <p className="text-xs font-medium text-green-600">{successMsg}</p>}

      <input
        className="input max-w-md bg-slate-50/50"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar práctica por nombre..."
      />

      {loading && <p className="animate-pulse text-sm text-slate-500">Cargando...</p>}

      <div className="space-y-3">
        {filtered.length === 0 && !loading ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No hay prácticas registradas en el catálogo.
          </p>
        ) : (
          filtered.map((p) => {
            const activo = p.activo !== false; // Default a true
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm hover:border-slate-200 transition-colors"
              >
                <div>
                  <p className="font-semibold text-slate-800">{p.nombre}</p>
                  <p className="mt-0.5 font-mono text-3xs text-slate-400">ID: {p.id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      activo
                        ? "border-green-100 bg-green-50 text-green-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }`}
                  >
                    {activo ? "Activa" : "Inactiva"}
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={activo}
                      onChange={(e) => onToggle(p.id, e.target.checked)}
                      className="peer sr-only"
                      title={activo ? "Desactivar" : "Activar"}
                    />
                    <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(p)}
                    className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-3xs font-bold text-red-600 transition-colors hover:bg-red-100"
                    title="Eliminar del catálogo"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <h3 className="text-sm font-extrabold text-slate-800">Eliminar práctica clínica</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              ¿Eliminar la práctica <strong>{deleteTarget.nombre}</strong> del catálogo? Los registros
              históricos de atención que ya la referencian no se modificarán.
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
