-- ============================================================
-- 075 · Secuencias atómicas para Toma de Equipo
--
-- Reemplaza el patrón buggy `count(*) + 1` con secuencias PostgreSQL.
-- Usa setval con is_called=false cuando no hay rows previas, para que
-- el primer nextval() devuelva 1 (no 2).
-- ============================================================

-- ── Tomas de equipo (TE-00001) ──────────────────────────────
DO $$
DECLARE max_n INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tomas_equipo_numero_seq') THEN
    CREATE SEQUENCE public.tomas_equipo_numero_seq;
  END IF;

  SELECT COALESCE(MAX(CAST(REPLACE(numero, 'TE-', '') AS INTEGER)), 0)
    INTO max_n
    FROM public.tomas_equipo
    WHERE numero ~ '^TE-[0-9]+$';

  IF max_n > 0 THEN
    PERFORM setval('public.tomas_equipo_numero_seq', max_n, true);  -- next = max_n + 1
  ELSE
    PERFORM setval('public.tomas_equipo_numero_seq', 1, false);     -- next = 1
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_toma_equipo_numero()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'TE-' || LPAD(nextval('public.tomas_equipo_numero_seq')::TEXT, 5, '0');
$$;

-- ── Recepciones de toma (REC-TE-00001) ──────────────────────
DO $$
DECLARE max_n INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'recepciones_toma_numero_seq') THEN
    CREATE SEQUENCE public.recepciones_toma_numero_seq;
  END IF;

  SELECT COALESCE(MAX(CAST(REPLACE(numero, 'REC-TE-', '') AS INTEGER)), 0)
    INTO max_n
    FROM public.recepciones_toma
    WHERE numero ~ '^REC-TE-[0-9]+$';

  IF max_n > 0 THEN
    PERFORM setval('public.recepciones_toma_numero_seq', max_n, true);
  ELSE
    PERFORM setval('public.recepciones_toma_numero_seq', 1, false);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_recepcion_toma_numero()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'REC-TE-' || LPAD(nextval('public.recepciones_toma_numero_seq')::TEXT, 5, '0');
$$;

-- ── Notas de crédito por toma (NC-TE-00001) ─────────────────
-- Prefijo NC-TE para diferenciar de NC-A (NC de venta clásicas).
DO $$
DECLARE max_n INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'nc_toma_equipo_numero_seq') THEN
    CREATE SEQUENCE public.nc_toma_equipo_numero_seq;
  END IF;

  SELECT COALESCE(MAX(CAST(REPLACE(numero, 'NC-TE-', '') AS INTEGER)), 0)
    INTO max_n
    FROM public.ajustes_clientes
    WHERE numero ~ '^NC-TE-[0-9]+$';

  IF max_n > 0 THEN
    PERFORM setval('public.nc_toma_equipo_numero_seq', max_n, true);
  ELSE
    PERFORM setval('public.nc_toma_equipo_numero_seq', 1, false);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_nc_toma_equipo_numero()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'NC-TE-' || LPAD(nextval('public.nc_toma_equipo_numero_seq')::TEXT, 5, '0');
$$;
