-- ============================================================
-- 062_add_cotizacion_senia_pago.sql
-- Agrega cotizacion_senia (tipo de cambio al momento del pago)
-- y monto_senia_usd (equivalente en USD del pago recibido)
-- a senias_equipo para soporte de cuenta corriente en USD
-- IDEMPOTENTE
-- ============================================================

ALTER TABLE public.senias_equipo
  ADD COLUMN IF NOT EXISTS cotizacion_senia NUMERIC(15,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monto_senia_usd  NUMERIC(15,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recibo_senia_id  INTEGER       DEFAULT NULL;
