-- ============================================================
-- 106 · Persistir moneda + cotización en tomas_equipo
--
-- Sin esto, cuando se confirma la Recepción de Toma (días
-- después), no hay cómo saber a qué cotización del día se
-- valuó la toma original — y los asientos contables (NC y
-- recepción) quedan sin convertir USD→ARS y se anotan como
-- pesos crudos. Bug: NC por USD 300 quedaba como $300 en vez
-- de $300 × cotización_blue.
-- ============================================================

ALTER TABLE public.tomas_equipo
  ADD COLUMN IF NOT EXISTS cotizacion NUMERIC(15,4);

ALTER TABLE public.tomas_equipo
  ADD COLUMN IF NOT EXISTS tipo_cotizacion TEXT;

NOTIFY pgrst, 'reload schema';
