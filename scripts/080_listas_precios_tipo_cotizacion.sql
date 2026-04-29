-- ============================================================
-- 080 · Tipo de cotización por lista de precios
--
-- Cada lista define qué cotización usar cuando hay que convertir
-- USD ↔ ARS (oficial, blue, ccl, mep, divisa, billete).
-- Se propaga a NV, OE, Remito, Factura, Recibo creados desde esa lista.
-- ============================================================

ALTER TABLE public.listas_precios
  ADD COLUMN IF NOT EXISTS tipo_cotizacion TEXT NOT NULL DEFAULT 'blue'
  CHECK (tipo_cotizacion IN ('oficial', 'blue', 'ccl', 'mep', 'divisa', 'billete'));

COMMENT ON COLUMN public.listas_precios.tipo_cotizacion IS
  'Cotización default a aplicar en conversiones USD↔ARS para los comprobantes generados desde esta lista.';
