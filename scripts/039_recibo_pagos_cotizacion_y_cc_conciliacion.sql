-- =====================================================================
-- 039: Agregar cotización a recibo_pagos y conciliacion_id a CC
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- 1. Cotización por línea de pago (necesaria para conversión USD → ARS en asientos)
ALTER TABLE public.recibo_pagos
  ADD COLUMN IF NOT EXISTS cotizacion       DECIMAL(18,6),
  ADD COLUMN IF NOT EXISTS tipo_cotizacion  VARCHAR(50);

-- 2. ID de conciliación cruzada en movimientos de CC bimonetaria
ALTER TABLE public.ventas_cc_movimientos
  ADD COLUMN IF NOT EXISTS conciliacion_id UUID;

-- 3. Índice opcional para relacionar filas de conciliación cruzada
CREATE INDEX IF NOT EXISTS idx_ventas_cc_conciliacion_id
  ON public.ventas_cc_movimientos (conciliacion_id)
  WHERE conciliacion_id IS NOT NULL;
