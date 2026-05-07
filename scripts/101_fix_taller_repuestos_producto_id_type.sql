-- ============================================================
-- 101 · Corrige tipo de `producto_id` en tablas de repuestos
--      del módulo taller (UUID → BIGINT, matchea productos.id)
--
-- Mismo patrón que script 065 (recibos.cliente_id) y 100
-- (taller_ordenes_trabajo.cliente_id). Las dos tablas
-- afectadas son:
--   - taller_ot_repuestos.producto_id
--   - taller_fallas_por_equipo_repuestos.producto_id
-- Ambas tenían UUID NOT NULL pero productos.id es BIGSERIAL.
--
-- Idempotente: verifica el tipo antes de alterar. Las filas
-- existentes con UUID no son convertibles, así que se pierde el
-- vínculo (queda NULL en BIGINT). Eran datos de prueba.
-- ============================================================

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  -- ── taller_ot_repuestos.producto_id ────────────────────────
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'taller_ot_repuestos'
      AND column_name  = 'producto_id'
      AND data_type    = 'uuid'
  ) THEN
    -- Buscar y dropear FK si existe
    SELECT tc.constraint_name INTO v_constraint
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    WHERE tc.table_schema  = 'public'
      AND tc.table_name    = 'taller_ot_repuestos'
      AND kcu.column_name  = 'producto_id'
      AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;

    IF v_constraint IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.taller_ot_repuestos DROP CONSTRAINT %I', v_constraint);
    END IF;

    ALTER TABLE public.taller_ot_repuestos DROP COLUMN producto_id;
    ALTER TABLE public.taller_ot_repuestos
      ADD COLUMN producto_id BIGINT REFERENCES public.productos(id);

    RAISE NOTICE 'taller_ot_repuestos.producto_id convertido de UUID a BIGINT';
  ELSE
    RAISE NOTICE 'taller_ot_repuestos.producto_id ya es del tipo correcto';
  END IF;

  -- ── taller_fallas_por_equipo_repuestos.producto_id ─────────
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'taller_fallas_por_equipo_repuestos'
      AND column_name  = 'producto_id'
      AND data_type    = 'uuid'
  ) THEN
    SELECT tc.constraint_name INTO v_constraint
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    WHERE tc.table_schema  = 'public'
      AND tc.table_name    = 'taller_fallas_por_equipo_repuestos'
      AND kcu.column_name  = 'producto_id'
      AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;

    IF v_constraint IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.taller_fallas_por_equipo_repuestos DROP CONSTRAINT %I', v_constraint);
    END IF;

    ALTER TABLE public.taller_fallas_por_equipo_repuestos DROP COLUMN producto_id;
    ALTER TABLE public.taller_fallas_por_equipo_repuestos
      ADD COLUMN producto_id BIGINT REFERENCES public.productos(id);

    RAISE NOTICE 'taller_fallas_por_equipo_repuestos.producto_id convertido de UUID a BIGINT';
  ELSE
    RAISE NOTICE 'taller_fallas_por_equipo_repuestos.producto_id ya es del tipo correcto';
  END IF;
END;
$$;
