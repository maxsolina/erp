-- ============================================================================
-- 083_alter_facturas_estado_confirmada.sql
-- Agrega "confirmada" a los estados aceptados de facturas.
--
-- Flujo de estados:
--   abierta     → factura recién creada, asiento 1 (negro) generado, EDITABLE
--   confirmada  → operador confirmó medios de pago, asiento 2 (IVA+recargo)
--                 generado, INMUTABLE. Se puede cobrar con recibo.
--   parcial     → cobrada parcialmente con recibo(s)
--   cobrada     → cobrada en su totalidad
--   conciliada  → conciliada con extracto bancario
--   cancelada   → anulada (con asiento de reversa)
--
-- IDEMPOTENTE: drop + create del CHECK
-- ============================================================================

ALTER TABLE public.facturas
  DROP CONSTRAINT IF EXISTS facturas_estado_check;

ALTER TABLE public.facturas
  ADD CONSTRAINT facturas_estado_check
  CHECK (estado IN (
    'abierta',
    'confirmada',
    'parcial',
    'cobrada',
    'conciliada',
    'cancelada'
  ));

-- ── Verificación ─────────────────────────────────────────────────────────────
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.facturas'::regclass
  AND conname  = 'facturas_estado_check';
