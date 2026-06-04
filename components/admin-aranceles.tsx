"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createArancel,
  getAranceles,
  setArancelActivo,
  updateArancelValor
} from "@/lib/supabase-service";
import type { Arancel } from "@/types";

export function AdminAranceles() {
  const [items, setItems] = useState<Arancel[]>([]);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para nuevo arancel
  const [showAddForm, setShowAddForm] = useState(false);
  const [newId, setNewId] = useState("");
  const [newDetalle, setNewDetalle] = useState("");
  const [newValor, setNewValor] = useState("");
  const [newCapitulo, setNewCapitulo] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await getAranceles());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onToggle(id: string, activo: boolean) {
    await setArancelActivo(id, activo);
    await load();
  }

  async function onSaveValor(id: string, valor: string) {
    const parsed = Number(valor);
    if (Number.isNaN(parsed)) return;
    await updateArancelValor(id, parsed);
    await load();
  }

  async function onSubmitAdd(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!newId || !newDetalle || !newValor || !newCapitulo) {
      setErrorMsg("Todos los campos son obligatorios.");
      return;
    }
    const valorNum = Number(newValor);
    if (Number.isNaN(valorNum) || valorNum <= 0) {
      setErrorMsg("El valor debe ser un número positivo.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createArancel({
        id: newId,
        detallePractica: newDetalle,
        valor: valorNum,
        capitulo: newCapitulo,
        activo: true
      });
      setSuccessMsg("Arancel creado exitosamente.");
      setNewId("");
      setNewDetalle("");
      setNewValor("");
      setNewCapitulo("");
      setShowAddForm(false);
      await load();
    } catch (err) {
      setErrorMsg(`Error al guardar: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const lower = term.toLowerCase();
    return items.filter(
      (x) =>
        x.id.toLowerCase().includes(lower) ||
        x.detallePractica.toLowerCase().includes(lower) ||
        x.capitulo.toLowerCase().includes(lower)
    );
  }, [items, term]);

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">Catálogo de Aranceles</h2>
          <p className="text-xs text-slate-500">Administra los códigos, capítulos y valores vigentes del sistema.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`btn text-xs font-semibold ${showAddForm ? "btn-secondary" : "btn-primary"}`}
        >
          {showAddForm ? "Cancelar" : "+ Nuevo Arancel"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={onSubmitAdd} className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 transition-all duration-300 md:grid-cols-4">
          <div className="md:col-span-4 border-b border-blue-100/50 pb-1">
            <h3 className="text-sm font-semibold text-blue-900">Registrar Nuevo Arancel</h3>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Código / Código Arancelario</label>
            <input
              className="input bg-white"
              placeholder="Ej: 01.02"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Detalle de la Práctica</label>
            <input
              className="input bg-white"
              placeholder="Ej: Consulta Odontológica de Urgencia"
              value={newDetalle}
              onChange={(e) => setNewDetalle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Valor de la Práctica ($)</label>
            <input
              className="input bg-white"
              type="number"
              step="0.01"
              placeholder="Ej: 7500"
              value={newValor}
              onChange={(e) => setNewValor(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Capítulo o Especialidad</label>
            <input
              className="input bg-white"
              placeholder="Ej: Consultas, Endodoncia, Prótesis..."
              value={newCapitulo}
              onChange={(e) => setNewCapitulo(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              disabled={isSubmitting}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2"
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Guardar Arancel"}
            </button>
          </div>
          {errorMsg && <p className="md:col-span-4 text-xs font-medium text-red-600">{errorMsg}</p>}
          {successMsg && <p className="md:col-span-4 text-xs font-medium text-green-600">{successMsg}</p>}
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="input max-w-md bg-slate-50/50"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="🔍 Buscar por código, práctica o capítulo..."
        />
      </div>

      {loading && <p className="text-sm text-slate-500 animate-pulse">Cargando catálogo...</p>}
      
      <div className="grid gap-3">
        {filtered.length === 0 && !loading ? (
          <p className="text-center py-6 text-sm text-slate-500">No se encontraron aranceles que coincidan con la búsqueda.</p>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md hover:border-slate-200 md:grid-cols-5 items-center"
            >
              <div className="md:col-span-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider bg-slate-100 text-slate-500 mb-1">
                  {a.capitulo}
                </span>
                <p className="font-semibold text-slate-800 text-sm leading-snug">{a.detallePractica}</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Código: {a.id}
                </p>
              </div>
              <div className="relative">
                <span className="absolute -top-2 left-2 bg-white px-1 text-3xs font-semibold text-slate-400">Valor ($)</span>
                <input
                  className="input font-semibold text-slate-700 bg-slate-50/30 text-right focus:bg-white"
                  defaultValue={a.valor}
                  onBlur={(e) => onSaveValor(a.id, e.target.value)}
                />
              </div>
              <div className="flex items-center md:justify-center">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  a.activo ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${a.activo ? "bg-green-500" : "bg-red-500"}`}></span>
                  {a.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex justify-end pr-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={a.activo}
                    onChange={(e) => onToggle(a.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}


