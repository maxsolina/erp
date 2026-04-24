-- ============================================================
-- 072 · Agregar estado y fecha_cancelacion a conciliaciones_deuda
-- ============================================================

ALTER TABLE public.conciliaciones_deuda
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'cancelada')),
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ NULL;

DO $$ BEGIN
  RAISE NOTICE 'Columnas estado y fecha_cancelacion agregadas a conciliaciones_deuda';
END $$;
