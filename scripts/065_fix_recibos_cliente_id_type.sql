-- ============================================================
-- 065 · Corrige tipo de recibos.cliente_id de UUID a INTEGER
--
-- El campo cliente_id fue creado como UUID por error, pero
-- clientes.id es INTEGER. Este script reemplaza la columna.
-- Idempotente: verifica el tipo antes de alterar.
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
      AND table_name   = 'recibos'
      AND column_name  = 'cliente_id'
      AND data_type    = 'uuid'
  ) THEN
    -- Buscar FK que referencie a esta columna, si existe
    SELECT tc.constraint_name INTO v_constraint
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    WHERE tc.table_schema  = 'public'
      AND tc.table_name    = 'recibos'
      AND kcu.column_name  = 'cliente_id'
      AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;

    IF v_constraint IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.recibos DROP CONSTRAINT %I', v_constraint);
    END IF;

    -- Reemplazar columna: drop + add (los valores UUID no son convertibles a integer)
    ALTER TABLE public.recibos DROP COLUMN cliente_id;
    ALTER TABLE public.recibos ADD COLUMN cliente_id INTEGER REFERENCES public.clientes(id);

    RAISE NOTICE 'recibos.cliente_id convertido de UUID a INTEGER';
  ELSE
    RAISE NOTICE 'recibos.cliente_id ya es del tipo correcto (no UUID), sin cambios';
  END IF;
END;
$$;
