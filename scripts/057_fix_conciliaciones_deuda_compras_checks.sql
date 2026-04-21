-- ============================================================
-- 057_fix_conciliaciones_deuda_compras_checks.sql
-- Corrige constraints y columnas necesarias para que la
-- conciliación de deuda de compras funcione correctamente.
-- IDEMPOTENTE: seguro para re-ejecución.
-- ============================================================

-- 1. facturas_compra: agregar 'pagada_parcial' al CHECK de estado
--    El flujo de conciliación asigna este estado cuando saldo > 0 pero < total.
ALTER TABLE public.facturas_compra
  DROP CONSTRAINT IF EXISTS facturas_compra_estado_check;

ALTER TABLE public.facturas_compra
  ADD CONSTRAINT facturas_compra_estado_check
  CHECK (estado IN ('borrador','pendiente','publicada','pagada','pagada_parcial','vencida','cancelada'));

-- 2. notas_credito_compra: agregar 'confirmada' al CHECK de estado
--    El módulo usa 'confirmada' como estado de una NC disponible para conciliar.
ALTER TABLE public.notas_credito_compra
  DROP CONSTRAINT IF EXISTS notas_credito_compra_estado_check;

ALTER TABLE public.notas_credito_compra
  ADD CONSTRAINT notas_credito_compra_estado_check
  CHECK (estado IN ('borrador','pendiente','confirmada','aplicada','cancelada'));

-- 3. compras_ordenes_pago: agregar importe_no_conciliado si no existe
--    Usado por la conciliación para rastrear el saldo disponible de cada OP.
ALTER TABLE public.compras_ordenes_pago
  ADD COLUMN IF NOT EXISTS importe_no_conciliado NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Inicializar importe_no_conciliado para OPs publicadas que no tengan valor asignado
UPDATE public.compras_ordenes_pago
SET importe_no_conciliado = importe
WHERE importe_no_conciliado = 0
  AND estado = 'publicado'
  AND importe > 0;

-- 4. compras_ordenes_pago: agregar moneda si no existe
--    Necesario para el filtrado bimonetario en la conciliación.
ALTER TABLE public.compras_ordenes_pago
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'ARS';
