export type DbEstadoFacturacion = "PENDIENTE" | "PARCIAL" | "PAGADA" | "ANULADA";

export type DbPaciente = {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  fecha_alta: string;
  created_at: string;
  updated_at: string;
};

export type DbProfesional = {
  id: string;
  nombre_completo: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type DbServicio = {
  id: string;
  nombre: string;
  created_at: string;
};

export type DbArancel = {
  id: string;
  detalle_practica: string;
  valor: number;
  capitulo: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type DbCatalogoPractica = {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type DbFacturacion = {
  id: string;
  fecha: string;
  paciente_id: string;
  paciente_nombre: string;
  practica_cobrada_id: string;
  practica_cobrada_detalle: string;
  servicio_asociado: string;
  costo_total: number;
  monto_abonado: number;
  saldo_pendiente: number;
  estado: DbEstadoFacturacion;
  profesional_id: string;
  detalle_adicional: string | null;
  eliminado: boolean;
  fecha_eliminacion: string | null;
  created_at: string;
  updated_at: string;
};

export type DbPagoRecibido = {
  id: string;
  facturacion_id: string;
  paciente_id: string;
  monto: number;
  fecha_pago: string;
  numero_recibo: string;
  observaciones: string | null;
  created_at: string;
};

export type DbPracticaClinica = {
  id: string;
  paciente_id: string;
  paciente_nombre: string;
  fecha_atencion: string;
  servicio: string;
  practica_realizada: string;
  odontologo_responsable: string;
  pasante: string | null;
  created_at: string;
};

export type DbPasante = {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type RegistrarPagoRpcResult = {
  pagoId: string;
  facturacionId: string;
  montoAbonado: number;
  saldoPendiente: number;
  estado: DbEstadoFacturacion;
};
