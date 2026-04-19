-- ============================================================================
-- 036_add_asiento_id_remitos.sql
-- Agrega columna asiento_id a la tabla remitos para vincular el asiento
-- contable CMV generado automáticamente al confirmar el remito de venta.
-- IDEMPOTENTE (re-ejecutable sin error)
-- ============================================================================

ALTER TABLE public.remitos
  ADD COLUMN IF NOT EXISTS asiento_id UUID REFERENCES public.contabilidad_asientos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.remitos.asiento_id IS 'Asiento contable CMV generado automáticamente al confirmar el remito de venta';
