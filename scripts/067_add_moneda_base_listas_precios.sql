-- ============================================================
-- 067 · Agrega columna moneda_base a listas_precios
--
-- La tabla listas_precios no tenía la columna moneda_base,
-- lo que impedía guardar la moneda de la lista.
-- Idempotente: verifica existencia antes de agregar.
-- ============================================================

DO $$
BEGIN
  -- 1. Agregar columna si no existe
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'listas_precios'
      AND column_name  = 'moneda_base'
  ) THEN
    ALTER TABLE public.listas_precios
      ADD COLUMN moneda_base TEXT NOT NULL DEFAULT 'ARS'
        CHECK (moneda_base IN ('ARS', 'USD', 'EUR'));

    RAISE NOTICE 'listas_precios.moneda_base agregada correctamente';
  ELSE
    RAISE NOTICE 'listas_precios.moneda_base ya existe, sin cambios';
  END IF;

  -- 2. Copiar valores de la columna existente "moneda" → "moneda_base"
  --    Solo para filas donde moneda_base sigue en el valor por defecto 'ARS'
  --    y la columna "moneda" tiene un valor distinto (ej: 'USD').
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'listas_precios'
      AND column_name  = 'moneda'
  ) THEN
    UPDATE public.listas_precios
    SET moneda_base = moneda
    WHERE moneda IN ('ARS', 'USD', 'EUR')
      AND moneda_base = 'ARS'
      AND moneda <> 'ARS';

    RAISE NOTICE 'Valores copiados de moneda → moneda_base (% filas)',
      (SELECT COUNT(*) FROM public.listas_precios WHERE moneda IN ('USD','EUR'));
  END IF;
END;
$$;
