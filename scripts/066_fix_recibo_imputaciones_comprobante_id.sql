-- ============================================================
-- 066 · Corrige tipo de recibo_imputaciones.comprobante_id
--      de UUID a INTEGER (facturas.id es INTEGER)
-- Idempotente: verifica el tipo antes de alterar.
-- ============================================================

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'recibo_imputaciones'
      AND column_name  = 'comprobante_id'
      AND data_type    = 'uuid'
  ) THEN
    -- Buscar FK sobre esta columna
    SELECT tc.constraint_name INTO v_constraint
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    WHERE tc.table_schema  = 'public'
      AND tc.table_name    = 'recibo_imputaciones'
      AND kcu.column_name  = 'comprobante_id'
      AND tc.constraint_type = 'FOREIGN KEY'
    LIMIT 1;

    IF v_constraint IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.recibo_imputaciones DROP CONSTRAINT %I', v_constraint);
    END IF;

    ALTER TABLE public.recibo_imputaciones DROP COLUMN comprobante_id;
    ALTER TABLE public.recibo_imputaciones ADD COLUMN comprobante_id INTEGER;

    RAISE NOTICE 'recibo_imputaciones.comprobante_id convertido de UUID a INTEGER';
  ELSE
    RAISE NOTICE 'recibo_imputaciones.comprobante_id ya es del tipo correcto, sin cambios';
  END IF;
END;
$$;
