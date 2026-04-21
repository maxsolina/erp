-- 047_add_cotizacion_moneda_campos.sql
-- Agrega tipo_cotizacion y cotizacion_dia a ordenes_compra
-- Agrega tipo_cotizacion_costo, costo_ars y costo_usd a productos
-- Idempotente: usa ADD COLUMN IF NOT EXISTS

-- ─── Órdenes de Compra ───────────────────────────────────────────────────────
ALTER TABLE public.ordenes_compra
  ADD COLUMN IF NOT EXISTS tipo_cotizacion TEXT DEFAULT 'oficial',   -- 'oficial', 'blue', 'mep'
  ADD COLUMN IF NOT EXISTS cotizacion_dia  NUMERIC(18,6) DEFAULT NULL;  -- valor ARS por 1 USD del día

COMMENT ON COLUMN public.ordenes_compra.tipo_cotizacion IS 'Tipo de cotización usado al momento de emitir la OC (oficial/blue/mep)';
COMMENT ON COLUMN public.ordenes_compra.cotizacion_dia  IS 'Cotización del día en ARS por 1 unidad de la moneda extranjera al emitir la OC';

-- ─── Productos: doble guardado y tipo de cotización del costo ─────────────────
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS tipo_cotizacion_costo TEXT DEFAULT 'oficial',  -- qué cotización usar para convertir
  ADD COLUMN IF NOT EXISTS costo_ars             NUMERIC(18,6) DEFAULT 0,  -- último costo siempre en ARS
  ADD COLUMN IF NOT EXISTS costo_usd             NUMERIC(18,6) DEFAULT 0;  -- último costo siempre en USD

COMMENT ON COLUMN public.productos.tipo_cotizacion_costo IS 'Tipo de cotización por defecto para conversión del costo (oficial/blue/mep)';
COMMENT ON COLUMN public.productos.costo_ars             IS 'Último costo contable expresado en ARS (se actualiza en cada recepción)';
COMMENT ON COLUMN public.productos.costo_usd             IS 'Último costo contable expresado en USD (se actualiza en cada recepción)';
