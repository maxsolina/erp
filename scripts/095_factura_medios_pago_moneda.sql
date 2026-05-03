-- ============================================================================
-- 095_factura_medios_pago_moneda.sql
-- Agrega columna `moneda` a factura_medios_pago para diferenciar pagos
-- en distintas monedas (ej: "Efectivo USD" vs "Efectivo ARS" en una misma
-- factura). Sin esta columna el frontend renderiza ambos con la moneda
-- de la factura.
--
-- IDEMPOTENTE
-- ============================================================================

ALTER TABLE public.factura_medios_pago
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'ARS'
    CHECK (moneda IN ('ARS', 'USD'));

-- Verificación
SELECT
  column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'factura_medios_pago'
  AND column_name = 'moneda';
