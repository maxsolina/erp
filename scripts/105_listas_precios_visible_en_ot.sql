-- ============================================================
-- 105 · Agrega flag `visible_en_ot` a listas_precios
--
-- Si está TRUE, la lista aparece en el dropdown de la ficha de
-- OT (módulo Servicio Técnico), permitiendo elegirla para
-- valuar los repuestos. Default FALSE para no contaminar el
-- dropdown con todas las listas existentes.
--
-- También agrega `lista_precios_id` a `taller_ordenes_trabajo`
-- para guardar la lista elegida por OT.
-- ============================================================

ALTER TABLE public.listas_precios
  ADD COLUMN IF NOT EXISTS visible_en_ot BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.taller_ordenes_trabajo
  ADD COLUMN IF NOT EXISTS lista_precios_id INTEGER REFERENCES public.listas_precios(id);

CREATE INDEX IF NOT EXISTS idx_taller_ot_lista_precios
  ON public.taller_ordenes_trabajo(lista_precios_id);

NOTIFY pgrst, 'reload schema';
