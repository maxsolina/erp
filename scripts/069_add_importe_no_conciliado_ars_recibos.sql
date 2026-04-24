-- ============================================================
-- 069 · Agrega importe_no_conciliado_ars a recibos
--
-- Necesario para recibos mixtos (pagos en ARS + USD).
-- importe_no_conciliado  → saldo USD pendiente
-- importe_no_conciliado_ars → saldo ARS pendiente (para recibos
--   con moneda='USD' que también tienen pagos en ARS)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'recibos'
      AND column_name  = 'importe_no_conciliado_ars'
  ) THEN
    ALTER TABLE public.recibos
      ADD COLUMN importe_no_conciliado_ars NUMERIC NOT NULL DEFAULT 0;
    RAISE NOTICE 'importe_no_conciliado_ars agregado a recibos';
  ELSE
    RAISE NOTICE 'importe_no_conciliado_ars ya existe, sin cambios';
  END IF;
END;
$$;
