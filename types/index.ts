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
