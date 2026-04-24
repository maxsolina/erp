-- ============================================================
-- 070 · Agrega columnas faltantes a listas_precios
--
-- La tabla solo tenía: id, nombre, moneda, activa, moneda_base
-- Este script agrega los campos que usa el módulo de ventas.
-- Idempotente.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listas_precios' AND column_name='incluye_iva') THEN
    ALTER TABLE public.listas_precios ADD COLUMN incluye_iva BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listas_precios' AND column_name='no_visible') THEN
    ALTER TABLE public.listas_precios ADD COLUMN no_visible BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listas_precios' AND column_name='dias_validez') THEN
    ALTER TABLE public.listas_precios ADD COLUMN dias_validez INTEGER NOT NULL DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listas_precios' AND column_name='estado') THEN
    ALTER TABLE public.listas_precios ADD COLUMN estado TEXT NOT NULL DEFAULT 'activa'
      CHECK (estado IN ('borrador','creada','activa','inactiva'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listas_precios' AND column_name='usuarios_admin') THEN
    ALTER TABLE public.listas_precios ADD COLUMN usuarios_admin INTEGER[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listas_precios' AND column_name='usuarios_habilitados') THEN
    ALTER TABLE public.listas_precios ADD COLUMN usuarios_habilitados INTEGER[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listas_precios' AND column_name='observaciones_filtro') THEN
    ALTER TABLE public.listas_precios ADD COLUMN observaciones_filtro TEXT NOT NULL DEFAULT '';
  END IF;

  RAISE NOTICE 'Columnas de listas_precios verificadas/agregadas correctamente';
END;
$$;

-- Borrar lista de prueba creada durante el diagnóstico
DELETE FROM public.listas_precios WHERE nombre = 'Test Direct Simple';
