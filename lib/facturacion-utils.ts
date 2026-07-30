import type { EstadoFacturacion, Facturacion } from "@/types";

/** Factura/cargo vigente: no fue eliminado (anulado) del sistema. */
export function esFacturacionVigente(
  item: Pick<Facturacion, "estado" | "eliminado">
): boolean {
  return item.estado !== "ANULADA" && item.eliminado !== true;
}

export function calcularEstadoFacturacion(
  costoTotal: number,
  saldoPendiente: number
): EstadoFacturacion {
  if (saldoPendiente <= 0) return "PAGADA";
  if (saldoPendiente < costoTotal) return "PARCIAL";
  return "PENDIENTE";
}

export function normalizarFacturacion<T extends {
  costoTotal: number;
  saldoPendiente: number;
  estado?: EstadoFacturacion;
}>(item: T): T & { estado: EstadoFacturacion } {
  return {
    ...item,
    estado: item.estado ?? calcularEstadoFacturacion(item.costoTotal, item.saldoPendiente)
  };
}
