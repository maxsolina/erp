-- ============================================================
-- 079 · Soporte de descuento porcentual dinámico en criterios
--
-- Permite expresar un descuento como % del valor_base_usd del modelo.
-- Si descuento_porcentaje IS NOT NULL → el descuento efectivo se
-- calcula al vuelo: base * porcentaje / 100. Útil para criterios
-- como "cartel sistema = -50%" que escalan con el valor del equipo.
--
-- Si descuento_porcentaje IS NULL → se usa descuento_usd nominal (fijo).
-- ============================================================

ALTER TABLE public.cotizador_criterios
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2);

COMMENT ON COLUMN public.cotizador_criterios.descuento_porcentaje IS
  'Si NOT NULL, el descuento efectivo se calcula como valor_base_usd * porcentaje / 100. Si NULL, se usa descuento_usd nominal.';
