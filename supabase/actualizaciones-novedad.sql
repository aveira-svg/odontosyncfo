-- =============================================================================
-- OdontoSync FO — Tabla para Registro de Actualizaciones (Historial/Comentarios)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- 1. Crear la tabla de actualizaciones de novedad
CREATE TABLE IF NOT EXISTS public.novedad_actualizaciones (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  novedad_id         TEXT NOT NULL REFERENCES public.novedades(id) ON DELETE CASCADE,
  nota               TEXT NOT NULL,
  creado_por_id      TEXT NOT NULL,
  creado_por_nombre  TEXT NOT NULL,
  fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS) en la tabla
ALTER TABLE public.novedad_actualizaciones ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS para public.novedad_actualizaciones
DROP POLICY IF EXISTS "authenticated_select_actualizaciones" ON public.novedad_actualizaciones;
CREATE POLICY "authenticated_select_actualizaciones"
  ON public.novedad_actualizaciones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_actualizaciones" ON public.novedad_actualizaciones;
CREATE POLICY "authenticated_insert_actualizaciones"
  ON public.novedad_actualizaciones FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_actualizaciones" ON public.novedad_actualizaciones;
CREATE POLICY "authenticated_update_actualizaciones"
  ON public.novedad_actualizaciones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_actualizaciones" ON public.novedad_actualizaciones;
CREATE POLICY "authenticated_delete_actualizaciones"
  ON public.novedad_actualizaciones FOR DELETE TO authenticated USING (true);

-- 4. Crear índice para optimizar la carga del historial en orden cronológico
CREATE INDEX IF NOT EXISTS idx_novedad_actualizaciones_novedad_id
  ON public.novedad_actualizaciones (novedad_id, fecha_creacion ASC);

-- 5. Trigger para actualizar el campo updated_at de forma automática
DROP TRIGGER IF EXISTS trg_novedad_actualizaciones_updated_at ON public.novedad_actualizaciones;
CREATE TRIGGER trg_novedad_actualizaciones_updated_at
  BEFORE UPDATE ON public.novedad_actualizaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
