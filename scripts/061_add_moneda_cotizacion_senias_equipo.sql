-- ============================================================
-- 061_add_moneda_cotizacion_senias_equipo.sql
-- Agrega moneda y cotizacion a la tabla senias_equipo para
-- soportar señas en USD y cruce bimonetario
-- IDEMPOTENTE
-- ============================================================

ALTER TABLE public.senias_equipo
  ADD COLUMN IF NOT EXISTS moneda     TEXT    DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS cotizacion NUMERIC(15,4) DEFAULT 1;

-- Inicializar existentes con ARS/1
UPDATE public.senias_equipo
SET moneda = 'ARS', cotizacion = 1
WHERE moneda IS NULL OR cotizacion IS NULL;
