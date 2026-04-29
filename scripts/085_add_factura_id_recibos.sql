-- ============================================================================
-- 085_add_factura_id_recibos.sql
-- Agrega columna factura_id a la tabla recibos para vincular un recibo a una
-- factura específica (caso típico: cobro registrado desde el botón "Registrar
-- Cobro" de una factura).
--
-- IDEMPOTENTE
-- ============================================================================

ALTER TABLE public.recibos
  ADD COLUMN IF NOT EXISTS factura_id INTEGER REFERENCES public.facturas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recibos_factura_id_idx ON public.recibos(factura_id) WHERE factura_id IS NOT NULL;

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'recibos' AND column_name = 'factura_id';
