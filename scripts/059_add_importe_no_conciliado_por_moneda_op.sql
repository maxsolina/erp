-- ============================================================
-- 059_add_importe_no_conciliado_por_moneda_op.sql
-- Agrega importe_no_conciliado_ars e importe_no_conciliado_usd
-- a compras_ordenes_pago para trackear saldo disponible
-- por moneda en OPs bimonetarias.
-- También agrega credito_moneda a las aplicaciones de
-- conciliación para soportar el revert correcto.
-- IDEMPOTENTE
-- ============================================================

-- 1. Columnas por moneda en ordenes_pago
ALTER TABLE public.compras_ordenes_pago
  ADD COLUMN IF NOT EXISTS importe_no_conciliado_ars NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS importe_no_conciliado_usd NUMERIC(15,2);

-- 2. Columna credito_moneda en aplicaciones
ALTER TABLE public.conciliaciones_deuda_compras_aplicaciones
  ADD COLUMN IF NOT EXISTS credito_moneda TEXT DEFAULT 'ARS';

-- 3. Inicializar desde medios para OPs publicadas
-- (Solo setea valores donde aún no hay datos)
UPDATE public.compras_ordenes_pago op
SET
  importe_no_conciliado_ars = (
    SELECT COALESCE(SUM(m.importe_comp), 0)
    FROM compras_op_medios_pago m
    WHERE m.op_id = op.id AND (m.moneda IS NULL OR m.moneda = 'ARS')
  ),
  importe_no_conciliado_usd = (
    SELECT COALESCE(SUM(m.importe), 0)
    FROM compras_op_medios_pago m
    WHERE m.op_id = op.id AND m.moneda = 'USD'
  )
WHERE op.importe_no_conciliado_ars IS NULL
  AND op.importe_no_conciliado_usd IS NULL;
