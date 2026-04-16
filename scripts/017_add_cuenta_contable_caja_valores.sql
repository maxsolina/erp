-- ============================================================================
-- 017_add_cuenta_contable_caja_valores.sql
-- Agrega cuenta_contable_id a caja_valores para que cada medio de pago tenga
-- su cuenta contable (DEBE en el asiento de cobro de recibos).
-- Patrón: efectivo ARS → 11010101, efectivo USD → 11010102,
--         banco_cheques → 11010104 (Valores a Depositar)
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS + UPDATE WHERE IS NULL
-- ============================================================================

ALTER TABLE caja_valores
  ADD COLUMN IF NOT EXISTS cuenta_contable_id UUID
    REFERENCES contabilidad_plan_cuentas(id) ON DELETE SET NULL;

-- Seed por tipo + moneda (solo categorías sin cuenta asignada)
UPDATE caja_valores
SET cuenta_contable_id = (
  SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11010101' LIMIT 1
)
WHERE tipo = 'efectivo' AND (moneda = 'ARS' OR moneda IS NULL)
  AND cuenta_contable_id IS NULL;

UPDATE caja_valores
SET cuenta_contable_id = (
  SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11010102' LIMIT 1
)
WHERE tipo = 'efectivo' AND moneda = 'USD'
  AND cuenta_contable_id IS NULL;

UPDATE caja_valores
SET cuenta_contable_id = (
  SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11010104' LIMIT 1
)
WHERE tipo = 'banco_cheques'
  AND cuenta_contable_id IS NULL;

-- Verificación
SELECT cv.id, cv.codigo, cv.nombre, cv.tipo, cv.moneda,
       cv.cuenta_contable_id,
       pc.codigo AS cuenta_codigo, pc.nombre AS cuenta_nombre
FROM caja_valores cv
LEFT JOIN contabilidad_plan_cuentas pc ON pc.id = cv.cuenta_contable_id
ORDER BY cv.nombre;
