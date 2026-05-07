-- ============================================================
-- 100 · Corrige tipo de taller_ordenes_trabajo.cliente_id
--      de UUID a INTEGER (matchea clientes.id).
--
-- El esquema original definía cliente_id como UUID NOT NULL pero
-- la tabla `clientes` usa id INTEGER. Mismo bug que ya se arregló
-- en `recibos` (script 065_fix_recibos_cliente_id_type.sql).
--
-- Idempotente: verifica el tipo antes de alterar. Las OTs creadas
-- previamente con cliente_id UUID (datos de prueba que no estaban
-- vinculados a clientes reales) pierden ese campo: queda NULL.
-- Por eso la nueva columna es nullable inicialmente. Si en el
-- futuro todas las OTs operativas tienen cliente válido, se puede
-- volver a NOT NULL en otra migración.
-- ============================================================

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  -- Solo actuar si la columna es de tipo uuid
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'taller_ordenes_trabajo'
      AND column_name  = 'cliente_id'
      AND data_type    = 'uuid'
  ) THEN
    -- Buscar FK existente sobre la columna y dropearla
    SELECT tc.constraint_name INTO v_constraint
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    WHERE tc.table_schema  = 'public'
      AND tc.table_name    = 'taller_ordenes_trabajo'
      AND kcu.column_name  = 'cliente_id'
      AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;

    IF v_constraint IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.taller_ordenes_trabajo DROP CONSTRAINT %I', v_constraint);
    END IF;

    -- Reemplazar columna: drop + add (los UUID no se pueden castear a int)
    ALTER TABLE public.taller_ordenes_trabajo DROP COLUMN cliente_id;
    ALTER TABLE public.taller_ordenes_trabajo
      ADD COLUMN cliente_id INTEGER REFERENCES public.clientes(id);

    -- Recrear el índice de búsqueda por cliente
    CREATE INDEX IF NOT EXISTS idx_taller_ot_cliente
      ON public.taller_ordenes_trabajo(cliente_id);

    RAISE NOTICE 'taller_ordenes_trabajo.cliente_id convertido de UUID a INTEGER';
  ELSE
    RAISE NOTICE 'taller_ordenes_trabajo.cliente_id ya es del tipo correcto, sin cambios';
  END IF;
END;
$$;
