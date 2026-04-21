-- Script 046: Permitir SELECT público en monedas y cotizaciones
-- El ERP usa auth propio (no Supabase Auth), por lo que el cliente
-- browser opera como rol 'anon'. Estas tablas son configuración
-- de solo lectura pública dentro del sistema.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contabilidad_monedas' AND policyname = 'allow_select_anon'
  ) THEN
    CREATE POLICY allow_select_anon ON contabilidad_monedas
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contabilidad_cotizaciones' AND policyname = 'allow_select_anon'
  ) THEN
    CREATE POLICY allow_select_anon ON contabilidad_cotizaciones
      FOR SELECT USING (true);
  END IF;
END $$;
