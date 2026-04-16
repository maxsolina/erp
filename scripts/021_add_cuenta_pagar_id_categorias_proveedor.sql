-- ============================================================================
-- 021_add_cuenta_pagar_id_categorias_proveedor.sql
-- Agrega cuenta_pagar_id UUID a categorias_proveedor (FK a contabilidad_plan_cuentas)
-- para permitir asientos automáticos de facturas de compra por categoría.
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS
-- ============================================================================

ALTER TABLE categorias_proveedor
  ADD COLUMN IF NOT EXISTS cuenta_pagar_id UUID
    REFERENCES contabilidad_plan_cuentas(id) ON DELETE SET NULL;

COMMENT ON COLUMN categorias_proveedor.cuenta_pagar_id IS
  'Cuenta contable de acreedores/proveedores a usar en asientos de facturas de compra para esta categoría. Sobreescribe el mapeo global.';
