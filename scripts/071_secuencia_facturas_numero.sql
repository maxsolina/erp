-- ============================================================
-- 071 · Secuencia atómica para numeración de facturas
--
-- Reemplaza la generación de número por MAX(id) en la API
-- con una secuencia PostgreSQL idempotente.
-- ============================================================

-- Crear secuencia si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'facturas_numero_seq') THEN
    -- Arrancar desde el número más alto ya existente
    CREATE SEQUENCE public.facturas_numero_seq;
    PERFORM setval(
      'public.facturas_numero_seq',
      COALESCE(
        (SELECT MAX(CAST(REPLACE(numero, 'FAC-', '') AS INTEGER))
         FROM public.facturas
         WHERE numero ~ '^FAC-[0-9]+$'),
        0
      )
    );
    RAISE NOTICE 'Secuencia facturas_numero_seq creada y sincronizada';
  ELSE
    RAISE NOTICE 'facturas_numero_seq ya existe';
  END IF;
END;
$$;

-- Función para obtener el próximo número de forma atómica
CREATE OR REPLACE FUNCTION public.next_factura_numero()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'FAC-' || LPAD(nextval('public.facturas_numero_seq')::TEXT, 5, '0');
$$;
