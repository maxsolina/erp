-- ============================================================
-- 104 · Agrega flag `control_inicial_obligatorio` a
--      taller_areas_reparacion. Por default FALSE (opcional).
--
-- Si está TRUE, la OT no puede pasar de borrador → sin_asignar
-- sin completar el control inicial. Si es FALSE, el operador
-- puede saltarlo desde la ficha.
-- ============================================================

ALTER TABLE public.taller_areas_reparacion
  ADD COLUMN IF NOT EXISTS control_inicial_obligatorio BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
