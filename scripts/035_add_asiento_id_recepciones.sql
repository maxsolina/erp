-- Agrega columna asiento_id a recepciones para vincular el asiento contable generado
-- de forma idempotente (re-ejecutable sin error)

ALTER TABLE public.recepciones
  ADD COLUMN IF NOT EXISTS asiento_id UUID REFERENCES public.contabilidad_asientos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.recepciones.asiento_id IS 'Asiento contable del circuito de compras generado al confirmar la recepción';
