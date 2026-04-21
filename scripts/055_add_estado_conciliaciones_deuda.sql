-- 055: Agregar columna estado a conciliaciones_deuda
-- Permite mantener historial de conciliaciones revertidas (estado 'cancelada')
-- en lugar de eliminarlas físicamente.

ALTER TABLE public.conciliaciones_deuda
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activa'
    CHECK (estado IN ('activa', 'cancelada')),
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

CREATE INDEX IF NOT EXISTS idx_conciliaciones_deuda_estado
  ON public.conciliaciones_deuda(estado);
