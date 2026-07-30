-- =============================================================================
-- OdontoSync FO — Migración para Categorías Dinámicas en Novedades
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- 1. Crear la tabla de categorías de novedad si no existe
CREATE TABLE IF NOT EXISTS public.categorias_novedades (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  nombre               TEXT UNIQUE NOT NULL,
  requiere_expediente  BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_consultorio BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS) en la tabla de categorías
ALTER TABLE public.categorias_novedades ENABLE ROW LEVEL SECURITY;

-- 3. Configurar políticas RLS para public.categorias_novedades
DROP POLICY IF EXISTS "authenticated_select_categorias" ON public.categorias_novedades;
CREATE POLICY "authenticated_select_categorias"
  ON public.categorias_novedades FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_categorias" ON public.categorias_novedades;
CREATE POLICY "authenticated_insert_categorias"
  ON public.categorias_novedades FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_categorias" ON public.categorias_novedades;
CREATE POLICY "authenticated_update_categorias"
  ON public.categorias_novedades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_categorias" ON public.categorias_novedades;
CREATE POLICY "authenticated_delete_categorias"
  ON public.categorias_novedades FOR DELETE TO authenticated USING (true);

-- 4. Insertar las categorías iniciales por defecto (si no existen)
INSERT INTO public.categorias_novedades (id, nombre, requiere_expediente, requiere_consultorio)
VALUES 
  (gen_random_uuid()::TEXT, 'EXPEDIENTE', TRUE, FALSE),
  (gen_random_uuid()::TEXT, 'DESPERFECTO', FALSE, TRUE),
  (gen_random_uuid()::TEXT, 'LIMPIEZA', FALSE, TRUE),
  (gen_random_uuid()::TEXT, 'REPARACION', FALSE, FALSE),
  (gen_random_uuid()::TEXT, 'RECORDATORIO', FALSE, FALSE),
  (gen_random_uuid()::TEXT, 'OTRO', FALSE, FALSE)
ON CONFLICT (nombre) DO NOTHING;

-- 5. Crear la tabla novedades si no existe (con estructura básica)
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
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Agregar la columna categoria_id si no existe
ALTER TABLE public.novedades ADD COLUMN IF NOT EXISTS categoria_id TEXT REFERENCES public.categorias_novedades(id) ON DELETE SET NULL;

-- 7. Eliminar la restricción anterior en novedades para permitir categorías dinámicas
ALTER TABLE public.novedades DROP CONSTRAINT IF EXISTS novedades_categoria_check;

-- 8. Actualizar las novedades existentes para que apunten a la categoría correcta por nombre
UPDATE public.novedades n
SET categoria_id = c.id
FROM public.categorias_novedades c
WHERE n.categoria = c.nombre AND n.categoria_id IS NULL;

-- 9. Asegurar los índices necesarios para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_novedades_estado_fecha
  ON public.novedades (estado, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_novedades_fecha_creacion
  ON public.novedades (fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_novedades_categoria_id
  ON public.novedades (categoria_id);

-- 10. Triggers para actualizar el campo updated_at de forma automática
DROP TRIGGER IF EXISTS trg_novedades_updated_at ON public.novedades;
CREATE TRIGGER trg_novedades_updated_at
  BEFORE UPDATE ON public.novedades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categorias_novedades_updated_at ON public.categorias_novedades;
CREATE TRIGGER trg_categorias_novedades_updated_at
  BEFORE UPDATE ON public.categorias_novedades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11. Habilitar RLS en novedades y asegurar sus políticas
ALTER TABLE public.novedades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_novedades" ON public.novedades;
CREATE POLICY "authenticated_select_novedades"
  ON public.novedades FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_novedades" ON public.novedades;
CREATE POLICY "authenticated_insert_novedades"
  ON public.novedades FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_novedades" ON public.novedades;
CREATE POLICY "authenticated_update_novedades"
  ON public.novedades FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_novedades" ON public.novedades;
CREATE POLICY "authenticated_delete_novedades"
  ON public.novedades FOR DELETE TO authenticated USING (true);
