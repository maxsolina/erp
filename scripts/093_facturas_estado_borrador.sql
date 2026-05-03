-- ============================================================================
-- 093_facturas_estado_borrador.sql
-- Agrega "borrador" a los estados aceptados de facturas.
--
-- El form de factura nueva (extraído) permite "Guardar Borrador" antes de
-- confirmar. Sin este script el insert falla con:
--   new row for relation "facturas" violates check constraint
--   "facturas_estado_check"
--
-- Estados completos:
--   borrador    → guardado para terminar después, sin asientos generados
--   abierta     → factura creada, asiento "negro" (sin IVA discriminado), editable
--   confirmada  → operador confirmó medios de pago, asiento 2 (IVA+recargo) generado
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
    'borrador',
    'abierta',
    'confirmada',
    'parcial',
    'cobrada',
    'conciliada',
    'cancelada'
  ));

-- ── Verificación ─────────────────────────────────────────────────────────────
SELECT 'OK - facturas_estado_check actualizado con borrador' AS resultado;
