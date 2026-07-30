-- =============================================================================
-- OdontoSync FO — Módulo Registro de Novedades (Bitácora Operativa)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.novedades (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  titulo               TEXT NOT NULL,
  categoria            TEXT NOT NULL,
  estado               TEXT NOT NULL DEFAULT 'PENDIENTE',
  fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_completado     TIMESTAMPTZ,
  expediente_numero    TEXT,
  expediente_fecha     TEXT,
  consultorio_box      TEXT,
  descripcion          TEXT,
  creado_por_id        TEXT NOT NULL,
  creado_por_nombre    TEXT NOT NULL,
  completado_por_id    TEXT,
  completado_por_nombre TEXT,
  notas_cierre         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT novedades_categoria_check CHECK (
    categoria IN ('EXPEDIENTE', 'DESPERFECTO', 'LIMPIEZA', 'REPARACION', 'RECORDATORIO', 'OTRO')
  ),
  CONSTRAINT novedades_estado_check CHECK (estado IN ('PENDIENTE', 'COMPLETADO'))
);

CREATE INDEX IF NOT EXISTS idx_novedades_estado_fecha
  ON public.novedades (estado, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_novedades_fecha_creacion
  ON public.novedades (fecha_creacion DESC);

CREATE TRIGGER trg_novedades_updated_at
  BEFORE UPDATE ON public.novedades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.novedades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_novedades"
  ON public.novedades FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_novedades"
  ON public.novedades FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_novedades"
  ON public.novedades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_delete_novedades"
  ON public.novedades FOR DELETE TO authenticated USING (true);
