-- ============================================================================
-- 084_alter_tarjetas_dias.sql
-- Agrega las columnas dias_presentacion y dias_pago a `tarjetas` si faltan.
--
-- Necesarias para el ABM de Tarjetas en Finanzas (modulo-finanzas.tsx).
-- En DBs viejas la tabla tarjetas existe pero sin estos campos porque el
-- 049_create_tarjetas.sql usa CREATE TABLE IF NOT EXISTS y por eso nunca
-- las agregó si la tabla ya existía con un esquema anterior.
--
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS
-- ============================================================================

ALTER TABLE public.tarjetas
  ADD COLUMN IF NOT EXISTS dias_presentacion INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS dias_pago         INTEGER NOT NULL DEFAULT 18;

-- Verificación
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tarjetas' AND table_schema = 'public'
ORDER BY ordinal_position;
