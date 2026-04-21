-- ============================================================
-- 060_add_moneda_cotizacion_aplicaciones.sql
-- Agrega debito_moneda, credito_moneda y cotizacion a las
-- tablas de aplicaciones de conciliación de deuda (ventas y compras)
-- IDEMPOTENTE
-- ============================================================

-- ── Compras ──────────────────────────────────────────────
ALTER TABLE public.conciliaciones_deuda_compras_aplicaciones
  ADD COLUMN IF NOT EXISTS debito_moneda  TEXT DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS cotizacion     NUMERIC(15,4);

-- credito_moneda ya se agregó en script 059, pero lo dejamos idempotente
ALTER TABLE public.conciliaciones_deuda_compras_aplicaciones
  ADD COLUMN IF NOT EXISTS credito_moneda TEXT DEFAULT 'ARS';

-- ── Ventas ───────────────────────────────────────────────
ALTER TABLE public.conciliaciones_deuda_aplicaciones
  ADD COLUMN IF NOT EXISTS debito_moneda  TEXT DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS credito_moneda TEXT DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS cotizacion     NUMERIC(15,4);
