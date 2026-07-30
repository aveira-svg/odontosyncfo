-- =============================================================================
-- OdontoSync FO — Esquema de Base de Datos para el Módulo de Stock e Inventario
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas del Módulo de Stock e Inventario
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.insumos (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nombre       TEXT NOT NULL,
  categoria    TEXT NOT NULL,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT insumos_stock_minimo_nonneg CHECK (stock_minimo >= 0)
);

CREATE TABLE IF NOT EXISTS public.lotes_insumos (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  insumo_id         TEXT NOT NULL REFERENCES public.insumos (id) ON DELETE CASCADE,
  numero_lote       TEXT NOT NULL,
  numero_serie      TEXT,
  fecha_vencimiento DATE NOT NULL,
  stock_actual      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lotes_insumos_stock_actual_nonneg CHECK (stock_actual >= 0)
);

CREATE TABLE IF NOT EXISTS public.movimientos_stock (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  insumo_id        TEXT NOT NULL REFERENCES public.insumos (id) ON DELETE RESTRICT,
  lote_id          TEXT NOT NULL REFERENCES public.lotes_insumos (id) ON DELETE RESTRICT,
  tipo             TEXT NOT NULL,
  cantidad         INTEGER NOT NULL,
  servicio_destino TEXT,
  paciente_id      TEXT REFERENCES public.pacientes (id) ON DELETE RESTRICT,
  profesional_id   TEXT REFERENCES public.profesionales (id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT movimientos_stock_tipo_check CHECK (tipo IN ('INGRESO', 'EGRESO')),
  CONSTRAINT movimientos_stock_cantidad_pos CHECK (cantidad > 0)
);

CREATE TABLE IF NOT EXISTS public.trazabilidad_cirugia (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  movimiento_id  TEXT NOT NULL REFERENCES public.movimientos_stock (id) ON DELETE CASCADE,
  paciente_id    TEXT NOT NULL REFERENCES public.pacientes (id) ON DELETE RESTRICT,
  profesional_id TEXT NOT NULL REFERENCES public.profesionales (id) ON DELETE RESTRICT,
  insumo_id      TEXT NOT NULL REFERENCES public.insumos (id) ON DELETE RESTRICT,
  numero_serie   TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Índices para optimizar búsquedas y consultas frecuentes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lotes_insumos_insumo ON public.lotes_insumos (insumo_id);
CREATE INDEX IF NOT EXISTS idx_lotes_insumos_vencimiento ON public.lotes_insumos (fecha_vencimiento ASC);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_insumo ON public.movimientos_stock (insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_created ON public.movimientos_stock (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trazabilidad_cirugia_paciente ON public.trazabilidad_cirugia (paciente_id);

-- -----------------------------------------------------------------------------
-- Triggers de updated_at para mantener las fechas de modificación
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_insumos_updated_at
  BEFORE UPDATE ON public.insumos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lotes_insumos_updated_at
  BEFORE UPDATE ON public.lotes_insumos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Habilitar Row Level Security (RLS) en las nuevas tablas
-- -----------------------------------------------------------------------------
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trazabilidad_cirugia ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Políticas de RLS para usuarios autenticados (acceso total)
-- -----------------------------------------------------------------------------
CREATE POLICY "authenticated_select" ON public.insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.insumos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.insumos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.insumos FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.lotes_insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.lotes_insumos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.lotes_insumos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.lotes_insumos FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.movimientos_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.movimientos_stock FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.movimientos_stock FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.movimientos_stock FOR DELETE TO authenticated USING (true);

CREATE POLICY "authenticated_select" ON public.trazabilidad_cirugia FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.trazabilidad_cirugia FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.trazabilidad_cirugia FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.trazabilidad_cirugia FOR DELETE TO authenticated USING (true);
