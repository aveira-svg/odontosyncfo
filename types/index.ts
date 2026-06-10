/** Compatible con fechas persistidas (ISO string o objeto con toDate). */
export type AppTimestamp = {
  toDate: () => Date;
  toMillis: () => number;
};

export type Paciente = {
  id: string;
  nombreCompleto: string;
  telefono?: string;
  fechaNacimiento?: string | AppTimestamp;
  direccion?: string;
  fechaAlta: AppTimestamp;
};

export type Arancel = {
  id: string;
  detallePractica: string;
  valor: number;
  capitulo: string;
  activo: boolean;
};

export type Profesional = {
  id: string;
  nombreCompleto: string;
  activo: boolean;
};

export type Servicio = {
  id: string;
  nombre: string;
};

export type PracticaClinica = {
  id?: string;
  pacienteId: string;
  pacienteNombre: string;
  fechaAtencion: AppTimestamp;
  servicio: string;
  practicaRealizada: string;
  odontologoResponsable: string;
  pasante?: string;
};

export type Pasante = {
  id: string;
  nombreCompleto: string;
  telefono?: string;
  activo: boolean;
};

export type EstadoFacturacion = "PENDIENTE" | "PARCIAL" | "PAGADA" | "ANULADA";

export type Facturacion = {
  id?: string;
  fecha: AppTimestamp;
  pacienteId: string;
  pacienteNombre: string;
  practicaCobradaId: string;
  practicaCobradaDetalle: string;
  servicioAsociado: string;
  costoTotal: number;
  montoAbonado: number;
  saldoPendiente: number;
  estado: EstadoFacturacion;
  eliminado?: boolean;
  fechaEliminacion?: AppTimestamp;
  detalleAdicional?: string;
  profesionalId: string;
};

export type PagoRecibido = {
  id?: string;
  facturacionId: string;
  pacienteId: string;
  monto: number;
  fechaPago: AppTimestamp;
  numeroRecibo: string;
  observaciones?: string;
};

export type Insumo = {
  id: string;
  nombre: string;
  categoria: string;
  stockMinimo: number;
  createdAt?: AppTimestamp;
  updatedAt?: AppTimestamp;
  stockActualTotal?: number;
};

export type LoteInsumo = {
  id: string;
  insumoId: string;
  numeroLote: string;
  numeroSerie?: string;
  fechaVencimiento: string;
  stockActual: number;
  createdAt?: AppTimestamp;
  updatedAt?: AppTimestamp;
  insumo?: Insumo;
};

export type MovimientoStock = {
  id: string;
  insumoId: string;
  loteId: string;
  tipo: "INGRESO" | "EGRESO";
  cantidad: number;
  servicioDestino?: string;
  pacienteId?: string;
  profesionalId?: string;
  createdAt?: AppTimestamp;
  insumo?: Insumo;
  lote?: LoteInsumo;
  paciente?: Paciente;
  profesional?: Profesional;
};

export type TrazabilidadCirugia = {
  id: string;
  movimientoId: string;
  pacienteId: string;
  profesionalId: string;
  insumoId: string;
  numeroSerie: string;
  createdAt?: AppTimestamp;
  movimiento?: MovimientoStock;
  paciente?: Paciente;
  profesional?: Profesional;
  insumo?: Insumo;
};
