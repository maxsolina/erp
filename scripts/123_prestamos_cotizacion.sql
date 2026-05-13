-- ============================================================
-- 123 · Préstamos: cotización para multi-moneda
--
-- Agrega cotizacion + tipo_cotizacion a prestamos para registrar
-- la equivalencia en ARS al momento del alta. Necesario para que
-- el asiento contable (siempre en ARS) cuadre cuando el préstamo
-- está en USD u otra moneda.
-- ============================================================

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS cotizacion DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS tipo_cotizacion VARCHAR(50);
