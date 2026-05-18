-- ============================================================
-- 134 · OT: campo observaciones_internas
--
-- En el formulario de OT separamos las observaciones en dos:
--   · descripcion             → visibles en la OT impresa / cliente
--   · observaciones_internas  → solo técnicos, no aparecen en la OT
--
-- Hasta hoy `observaciones_internas` se mandaba desde el form pero el
-- endpoint lo descartaba (no había columna). Agregamos la columna y
-- recargamos el cache de PostgREST.
-- ============================================================

ALTER TABLE public.taller_ordenes_trabajo
  ADD COLUMN IF NOT EXISTS observaciones_internas TEXT;

NOTIFY pgrst, 'reload schema';
