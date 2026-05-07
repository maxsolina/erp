-- ============================================================
-- 102 · Recrea las FK del módulo Taller que PostgREST puede no
--      tener registradas en su schema cache.
--
-- Síntoma del bug: PostgREST devuelve error tipo
--   "Could not find the 'taller_X' column of 'taller_Y' in the
--    schema cache"
-- al intentar usar joins anidados como
--   .select("*, taller_categorias_reparacion(nombre)")
--
-- Causa: la FK existe en el SQL del create-taller.sql pero puede
-- haberse perdido en algún drop/recreate, o el cache de PostgREST
-- está stale tras alteraciones de tipo (migraciones 100/101).
--
-- Este script:
--   1. Verifica cada FK relevante del módulo taller
--   2. La recrea solo si NO existe (idempotente)
--   3. Notifica a PostgREST que recargue su schema cache
-- ============================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  -- ── taller_categorias_reparacion.area_id → taller_areas_reparacion ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_categorias_reparacion'
    AND kcu.column_name = 'area_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_categorias_reparacion
      ADD CONSTRAINT taller_categorias_reparacion_area_id_fkey
      FOREIGN KEY (area_id) REFERENCES public.taller_areas_reparacion(id);
  END IF;

  -- ── taller_tipos_ot.area_id → taller_areas_reparacion ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_tipos_ot'
    AND kcu.column_name = 'area_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_tipos_ot
      ADD CONSTRAINT taller_tipos_ot_area_id_fkey
      FOREIGN KEY (area_id) REFERENCES public.taller_areas_reparacion(id);
  END IF;

  -- ── taller_equipos.area_id → taller_areas_reparacion ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_equipos'
    AND kcu.column_name = 'area_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_equipos
      ADD CONSTRAINT taller_equipos_area_id_fkey
      FOREIGN KEY (area_id) REFERENCES public.taller_areas_reparacion(id);
  END IF;

  -- ── taller_fallas.area_id → taller_areas_reparacion ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_fallas'
    AND kcu.column_name = 'area_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_fallas
      ADD CONSTRAINT taller_fallas_area_id_fkey
      FOREIGN KEY (area_id) REFERENCES public.taller_areas_reparacion(id);
  END IF;

  -- ── taller_fallas.categoria_id → taller_categorias_reparacion ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_fallas'
    AND kcu.column_name = 'categoria_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_fallas
      ADD CONSTRAINT taller_fallas_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES public.taller_categorias_reparacion(id);
  END IF;

  -- ── taller_controles.area_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_controles'
    AND kcu.column_name = 'area_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_controles
      ADD CONSTRAINT taller_controles_area_id_fkey
      FOREIGN KEY (area_id) REFERENCES public.taller_areas_reparacion(id);
  END IF;

  -- ── taller_controles.categoria_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_controles'
    AND kcu.column_name = 'categoria_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_controles
      ADD CONSTRAINT taller_controles_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES public.taller_categorias_reparacion(id);
  END IF;

  -- ── taller_tecnicos.area_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_tecnicos'
    AND kcu.column_name = 'area_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_tecnicos
      ADD CONSTRAINT taller_tecnicos_area_id_fkey
      FOREIGN KEY (area_id) REFERENCES public.taller_areas_reparacion(id);
  END IF;

  -- ── taller_tecnicos.categoria_principal_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_tecnicos'
    AND kcu.column_name = 'categoria_principal_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_tecnicos
      ADD CONSTRAINT taller_tecnicos_categoria_principal_id_fkey
      FOREIGN KEY (categoria_principal_id) REFERENCES public.taller_categorias_reparacion(id);
  END IF;

  -- ── taller_tecnicos.turno_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_tecnicos'
    AND kcu.column_name = 'turno_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_tecnicos
      ADD CONSTRAINT taller_tecnicos_turno_id_fkey
      FOREIGN KEY (turno_id) REFERENCES public.taller_turnos(id);
  END IF;

  -- ── taller_tecnico_categorias_secundarias.tecnico_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_tecnico_categorias_secundarias'
    AND kcu.column_name = 'tecnico_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_tecnico_categorias_secundarias
      ADD CONSTRAINT taller_tecnico_categorias_secundarias_tecnico_id_fkey
      FOREIGN KEY (tecnico_id) REFERENCES public.taller_tecnicos(id) ON DELETE CASCADE;
  END IF;

  -- ── taller_tecnico_categorias_secundarias.categoria_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_tecnico_categorias_secundarias'
    AND kcu.column_name = 'categoria_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_tecnico_categorias_secundarias
      ADD CONSTRAINT taller_tecnico_categorias_secundarias_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES public.taller_categorias_reparacion(id);
  END IF;

  -- ── taller_fallas_por_equipo.equipo_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_fallas_por_equipo'
    AND kcu.column_name = 'equipo_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_fallas_por_equipo
      ADD CONSTRAINT taller_fallas_por_equipo_equipo_id_fkey
      FOREIGN KEY (equipo_id) REFERENCES public.taller_equipos(id);
  END IF;

  -- ── taller_fallas_por_equipo.falla_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_fallas_por_equipo'
    AND kcu.column_name = 'falla_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_fallas_por_equipo
      ADD CONSTRAINT taller_fallas_por_equipo_falla_id_fkey
      FOREIGN KEY (falla_id) REFERENCES public.taller_fallas(id);
  END IF;

  -- ── taller_fallas_por_equipo.categoria_id (la que da el error reportado) ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_fallas_por_equipo'
    AND kcu.column_name = 'categoria_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_fallas_por_equipo
      ADD CONSTRAINT taller_fallas_por_equipo_categoria_id_fkey
      FOREIGN KEY (categoria_id) REFERENCES public.taller_categorias_reparacion(id);
  END IF;

  -- ── taller_fallas_por_equipo_repuestos.falla_equipo_id ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_fallas_por_equipo_repuestos'
    AND kcu.column_name = 'falla_equipo_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_fallas_por_equipo_repuestos
      ADD CONSTRAINT taller_fallas_por_equipo_repuestos_falla_equipo_id_fkey
      FOREIGN KEY (falla_equipo_id) REFERENCES public.taller_fallas_por_equipo(id) ON DELETE CASCADE;
  END IF;

  -- ── taller_ordenes_trabajo: varias FKs ──
  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_ordenes_trabajo'
    AND kcu.column_name = 'area_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_ordenes_trabajo
      ADD CONSTRAINT taller_ordenes_trabajo_area_id_fkey
      FOREIGN KEY (area_id) REFERENCES public.taller_areas_reparacion(id);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_ordenes_trabajo'
    AND kcu.column_name = 'tipo_ot_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_ordenes_trabajo
      ADD CONSTRAINT taller_ordenes_trabajo_tipo_ot_id_fkey
      FOREIGN KEY (tipo_ot_id) REFERENCES public.taller_tipos_ot(id);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_ordenes_trabajo'
    AND kcu.column_name = 'equipo_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_ordenes_trabajo
      ADD CONSTRAINT taller_ordenes_trabajo_equipo_id_fkey
      FOREIGN KEY (equipo_id) REFERENCES public.taller_equipos(id);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_ordenes_trabajo'
    AND kcu.column_name = 'falla_principal_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_ordenes_trabajo
      ADD CONSTRAINT taller_ordenes_trabajo_falla_principal_id_fkey
      FOREIGN KEY (falla_principal_id) REFERENCES public.taller_fallas(id);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_ordenes_trabajo'
    AND kcu.column_name = 'categoria_reparacion_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_ordenes_trabajo
      ADD CONSTRAINT taller_ordenes_trabajo_categoria_reparacion_id_fkey
      FOREIGN KEY (categoria_reparacion_id) REFERENCES public.taller_categorias_reparacion(id);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_ordenes_trabajo'
    AND kcu.column_name = 'tecnico_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_ordenes_trabajo
      ADD CONSTRAINT taller_ordenes_trabajo_tecnico_id_fkey
      FOREIGN KEY (tecnico_id) REFERENCES public.taller_tecnicos(id);
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND rc.constraint_schema = kcu.table_schema
  WHERE kcu.table_schema = 'public'
    AND kcu.table_name = 'taller_ordenes_trabajo'
    AND kcu.column_name = 'motivo_cierre_id';
  IF v_count = 0 THEN
    ALTER TABLE public.taller_ordenes_trabajo
      ADD CONSTRAINT taller_ordenes_trabajo_motivo_cierre_id_fkey
      FOREIGN KEY (motivo_cierre_id) REFERENCES public.taller_motivos_cierre(id);
  END IF;

  RAISE NOTICE 'FK del módulo taller verificadas y recreadas (las que faltaban)';
END;
$$;

-- Reload del cache de PostgREST para que reconozca todas las relaciones.
-- Esto evita errores tipo "Could not find the 'taller_X' column ... in
-- the schema cache" sin tener que reiniciar el servidor de Supabase.
NOTIFY pgrst, 'reload schema';
