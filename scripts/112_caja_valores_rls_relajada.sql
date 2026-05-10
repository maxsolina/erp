-- ============================================================
-- 112 · Relajar RLS de caja_valores para configuración
--
-- El script 111 puso RLS estricta: el usuario solo veía un caja_valor
-- si estaba asignado a ESE valor específico. Eso rompe la configuración
-- (el admin no puede listar todos los valores de la caja para asignar
-- usuarios) y otros flujos donde tener acceso a la caja debería implicar
-- ver sus valores.
--
-- Nuevo criterio para SELECT en caja_valores:
--   • superuser → todos
--   • el user está asignado a ESTE valor → lo ve
--   • el user está asignado a CUALQUIER valor de la misma caja → ve todos
--     los de esa caja (porque "tiene acceso a la caja")
--
-- El filtro fino (qué valor PUEDE OPERAR vs solo VER) queda a nivel de
-- código en los formularios operativos, no en la RLS.
-- ============================================================

DROP POLICY IF EXISTS caja_valores_select_asignados ON public.caja_valores;

CREATE POLICY caja_valores_select_asignados ON public.caja_valores
FOR SELECT USING (
  public.fn_es_superuser_actual()
  OR id IN (SELECT public.fn_mis_caja_valores_ids())
  -- Si tengo acceso a la CAJA (vía algún valor de la misma), veo todos sus valores
  OR caja_id IN (SELECT public.fn_mis_cajas_ids())
);

NOTIFY pgrst, 'reload schema';
