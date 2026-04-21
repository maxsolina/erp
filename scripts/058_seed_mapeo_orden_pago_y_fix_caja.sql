-- ============================================================
-- 058_seed_mapeo_orden_pago_y_fix_caja.sql
-- 1. Seed del mapeo contable para Órdenes de Pago (compras)
-- 2. Agrega columna asiento_id a compras_ordenes_pago
-- IDEMPOTENTE: WHERE NOT EXISTS + ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── 1. Mapeo contable para orden_pago ─────────────────────
-- El factory generarAsientoOrdenPago necesita poder resolver
-- la cuenta de Proveedores (21010101) via factura_compra.acreedores.
-- No se requiere una fila separada de tipo_origen='orden_pago';
-- el factory reutiliza directamente el mapeo de factura_compra.
-- Este script solo agrega el asiento_id a la tabla de OPs.

-- ── 2. Columna asiento_id en compras_ordenes_pago ─────────
ALTER TABLE public.compras_ordenes_pago
  ADD COLUMN IF NOT EXISTS asiento_id UUID REFERENCES contabilidad_asientos(id) ON DELETE SET NULL;

-- ── 3. Aseguramos que importe_no_conciliado y moneda existan ─
-- (ya crea el script 057, pero lo dejamos idempotente aquí también)
ALTER TABLE public.compras_ordenes_pago
  ADD COLUMN IF NOT EXISTS importe_no_conciliado NUMERIC(15,2) NOT NULL DEFAULT 0;

ALTER TABLE public.compras_ordenes_pago
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'ARS';

-- Inicializar importe_no_conciliado para OPs publicadas sin valor
UPDATE public.compras_ordenes_pago
SET importe_no_conciliado = importe
WHERE importe_no_conciliado = 0
  AND estado = 'publicado'
  AND importe > 0;
