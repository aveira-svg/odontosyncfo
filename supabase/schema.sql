-- =============================================================================
-- OdontoSync FO — Esquema PostgreSQL para Supabase
-- Migración desde Firestore. Ejecutar en: SQL Editor → New query → Run
-- =============================================================================

-- Extensiones útiles (búsqueda futura / agenda)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
CREATE TYPE public.estado_facturacion AS ENUM (
  'PENDIENTE',
  'PARCIAL',
  'PAGADA',
  'ANULADA'
);

-- -----------------------------------------------------------------------------
-- Tablas catálogo
-- -----------------------------------------------------------------------------

CREATE TABLE public.servicios (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nombre      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT servicios_nombre_unique UNIQUE (nombre)
);

CREATE TABLE public.profesionales (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nombre_completo  TEXT NOT NULL,
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.aranceles (
  id               TEXT PRIMARY KEY,
  detalle_practica TEXT NOT NULL,
  valor            NUMERIC(12, 2) NOT NULL,
  capitulo         TEXT NOT NULL DEFAULT '',
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT aranceles_valor_nonneg CHECK (valor >= 0)
);

CREATE TABLE public.catalogo_practicas_clinicas (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nombre     TEXT NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Pacientes (PK = DNI)
-- -----------------------------------------------------------------------------

CREATE TABLE public.pacientes (
  id                TEXT PRIMARY KEY,
  nombre_completo   TEXT NOT NULL,
  telefono          TEXT,
  fecha_nacimiento  DATE,
  direccion         TEXT,
  fecha_alta        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pacientes_nombre ON public.pacientes (nombre_completo);
CREATE INDEX idx_pacientes_nombre_trgm ON public.pacientes USING gin (nombre_completo gin_trgm_ops);
CREATE INDEX idx_pacientes_id_trgm ON public.pacientes USING gin (id gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Facturación (PK = N° recibo manual)
-- -----------------------------------------------------------------------------

CREATE TABLE public.facturacion (
  id                       TEXT PRIMARY KEY,
  fecha                    TIMESTAMPTZ NOT NULL,
  paciente_id              TEXT NOT NULL REFERENCES public.pacientes (id) ON DELETE RESTRICT,
  paciente_nombre          TEXT NOT NULL,
  practica_cobrada_id      TEXT NOT NULL,
  practica_cobrada_detalle TEXT NOT NULL,
  servicio_asociado        TEXT NOT NULL,
  costo_total              NUMERIC(12, 2) NOT NULL,
  monto_abonado            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  saldo_pendiente          NUMERIC(12, 2) NOT NULL,
  estado                   public.estado_facturacion NOT NULL DEFAULT 'PENDIENTE',
  profesional_id           TEXT NOT NULL REFERENCES public.profesionales (id) ON DELETE RESTRICT,
  detalle_adicional        TEXT,
  eliminado                BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_eliminacion        TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT facturacion_costo_nonneg CHECK (costo_total >= 0),
  CONSTRAINT facturacion_monto_abonado_nonneg CHECK (monto_abonado >= 0),
  CONSTRAINT facturacion_saldo_nonneg CHECK (saldo_pendiente >= 0),
  CONSTRAINT facturacion_monto_no_supera_costo CHECK (monto_abonado <= costo_total),
  CONSTRAINT facturacion_saldo_coherente CHECK (saldo_pendiente = costo_total - monto_abonado),
  CONSTRAINT facturacion_anulada_coherente CHECK (
    estado <> 'ANULADA'::public.estado_facturacion
    OR (eliminado = TRUE AND saldo_pendiente = 0 AND monto_abonado >= 0)
  )
);

CREATE INDEX idx_facturacion_paciente ON public.facturacion (paciente_id);
CREATE INDEX idx_facturacion_fecha ON public.facturacion (fecha DESC);
CREATE INDEX idx_facturacion_estado ON public.facturacion (estado) WHERE eliminado = FALSE;

-- -----------------------------------------------------------------------------
-- Pagos recibidos (N:1 con facturación)
-- -----------------------------------------------------------------------------

CREATE TABLE public.pagos_recibidos (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  facturacion_id  TEXT NOT NULL REFERENCES public.facturacion (id) ON DELETE RESTRICT,
  paciente_id     TEXT NOT NULL REFERENCES public.pacientes (id) ON DELETE RESTRICT,
  monto           NUMERIC(12, 2) NOT NULL,
  fecha_pago      TIMESTAMPTZ NOT NULL,
  numero_recibo   TEXT NOT NULL,
  observaciones   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pagos_monto_positivo CHECK (monto > 0),
  CONSTRAINT pagos_numero_recibo_unique UNIQUE (numero_recibo)
);

CREATE INDEX idx_pagos_facturacion ON public.pagos_recibidos (facturacion_id);
CREATE INDEX idx_pagos_fecha ON public.pagos_recibidos (fecha_pago DESC);

-- -----------------------------------------------------------------------------
-- Prácticas clínicas (atención en consultorio)
-- -----------------------------------------------------------------------------

CREATE TABLE public.practicas_clinicas (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  paciente_id            TEXT NOT NULL REFERENCES public.pacientes (id) ON DELETE RESTRICT,
  paciente_nombre        TEXT NOT NULL,
  fecha_atencion         TIMESTAMPTZ NOT NULL,
  servicio               TEXT NOT NULL,
  practica_realizada     TEXT NOT NULL,
  odontologo_responsable TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_practicas_paciente ON public.practicas_clinicas (paciente_id);
CREATE INDEX idx_practicas_fecha ON public.practicas_clinicas (fecha_atencion DESC);

-- -----------------------------------------------------------------------------
-- Funciones: estado de facturación y timestamps
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calcular_estado_facturacion(
  p_costo_total NUMERIC,
  p_saldo_pendiente NUMERIC
)
RETURNS public.estado_facturacion
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_saldo_pendiente <= 0 THEN 'PAGADA'::public.estado_facturacion
    WHEN p_saldo_pendiente < p_costo_total THEN 'PARCIAL'::public.estado_facturacion
    ELSE 'PENDIENTE'::public.estado_facturacion
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_facturacion_derived_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();

  IF NEW.estado = 'ANULADA'::public.estado_facturacion THEN
    NEW.saldo_pendiente := 0;
    RETURN NEW;
  END IF;

  NEW.saldo_pendiente := GREATEST(0, NEW.costo_total - NEW.monto_abonado);
  NEW.estado := public.calcular_estado_facturacion(NEW.costo_total, NEW.saldo_pendiente);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_facturacion_sync_estado
  BEFORE INSERT OR UPDATE OF costo_total, monto_abonado, saldo_pendiente, estado
  ON public.facturacion
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_facturacion_derived_fields();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pacientes_updated_at
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profesionales_updated_at
  BEFORE UPDATE ON public.profesionales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_aranceles_updated_at
  BEFORE UPDATE ON public.aranceles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Búsqueda de pacientes (servidor, ilike + trigram opcional)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.buscar_pacientes(
  p_query TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF public.pacientes
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_query TEXT;
  v_pattern TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  v_query := trim(coalesce(p_query, ''));
  p_limit := LEAST(GREATEST(coalesce(p_limit, 50), 1), 200);

  IF v_query = '' THEN
    RETURN QUERY
      SELECT *
      FROM public.pacientes
      ORDER BY nombre_completo
      LIMIT p_limit;
    RETURN;
  END IF;

  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
    SELECT *
    FROM public.pacientes p
    WHERE
      p.id ILIKE v_pattern ESCAPE '\'
      OR p.nombre_completo ILIKE v_pattern ESCAPE '\'
      OR similarity(p.nombre_completo, v_query) > 0.25
      OR similarity(p.id, v_query) > 0.25
    ORDER BY
      CASE WHEN p.id ILIKE v_pattern ESCAPE '\' THEN 0 ELSE 1 END,
      similarity(p.nombre_completo, v_query) DESC,
      p.nombre_completo
    LIMIT p_limit;
END;
$$;

-- -----------------------------------------------------------------------------
-- Transacción atómica: registrar abono parcial
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.registrar_pago_recibido(
  p_facturacion_id TEXT,
  p_paciente_id TEXT,
  p_numero_recibo TEXT,
  p_monto NUMERIC,
  p_fecha_pago TIMESTAMPTZ,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fact public.facturacion%ROWTYPE;
  v_nuevo_abonado NUMERIC(12, 2);
  v_nuevo_saldo NUMERIC(12, 2);
  v_estado public.estado_facturacion;
  v_pago_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto del abono debe ser mayor a cero.';
  END IF;

  SELECT *
  INTO v_fact
  FROM public.facturacion
  WHERE id = p_facturacion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la factura o cargo indicado.';
  END IF;

  IF v_fact.paciente_id <> p_paciente_id THEN
    RAISE EXCEPTION 'El paciente no coincide con la factura.';
  END IF;

  IF v_fact.estado = 'ANULADA'::public.estado_facturacion OR v_fact.eliminado THEN
    RAISE EXCEPTION 'No se pueden registrar pagos sobre una factura anulada.';
  END IF;

  IF p_monto > v_fact.saldo_pendiente THEN
    RAISE EXCEPTION 'El monto no puede superar el saldo pendiente (%).', v_fact.saldo_pendiente;
  END IF;

  IF EXISTS (SELECT 1 FROM public.pagos_recibidos WHERE numero_recibo = p_numero_recibo) THEN
    RAISE EXCEPTION 'Ya existe un pago registrado con el N° Recibo %.', p_numero_recibo;
  END IF;

  v_pago_id := gen_random_uuid()::TEXT;

  INSERT INTO public.pagos_recibidos (
    id,
    facturacion_id,
    paciente_id,
    monto,
    fecha_pago,
    numero_recibo,
    observaciones
  ) VALUES (
    v_pago_id,
    p_facturacion_id,
    p_paciente_id,
    p_monto,
    p_fecha_pago,
    p_numero_recibo,
    p_observaciones
  );

  v_nuevo_abonado := v_fact.monto_abonado + p_monto;
  v_nuevo_saldo := GREATEST(0, v_fact.costo_total - v_nuevo_abonado);
  v_estado := public.calcular_estado_facturacion(v_fact.costo_total, v_nuevo_saldo);

  UPDATE public.facturacion
  SET
    monto_abonado = v_nuevo_abonado,
    saldo_pendiente = v_nuevo_saldo,
    estado = v_estado,
    updated_at = NOW()
  WHERE id = p_facturacion_id;

  RETURN jsonb_build_object(
    'pagoId', v_pago_id,
    'facturacionId', p_facturacion_id,
    'montoAbonado', v_nuevo_abonado,
    'saldoPendiente', v_nuevo_saldo,
    'estado', v_estado::TEXT
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aranceles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_practicas_clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_recibidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practicas_clinicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select" ON public.servicios
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.servicios
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.servicios
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.servicios
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.profesionales
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.profesionales
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.profesionales
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.profesionales
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.aranceles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.aranceles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.aranceles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.aranceles
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.catalogo_practicas_clinicas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.catalogo_practicas_clinicas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.catalogo_practicas_clinicas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.catalogo_practicas_clinicas
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.pacientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.pacientes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.pacientes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.pacientes
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.facturacion
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.facturacion
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.facturacion
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.facturacion
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.pagos_recibidos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.pagos_recibidos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.pagos_recibidos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.pagos_recibidos
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.practicas_clinicas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.practicas_clinicas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.practicas_clinicas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.practicas_clinicas
  FOR DELETE TO authenticated USING (true);

-- Permisos sobre funciones RPC
GRANT EXECUTE ON FUNCTION public.buscar_pacientes(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pago_recibido(TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT) TO authenticated;
