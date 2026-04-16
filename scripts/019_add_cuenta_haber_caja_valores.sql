-- ============================================================================
-- 019_add_cuenta_haber_caja_valores.sql
-- Agrega cuenta_haber_id a caja_valores.
-- cuenta_contable_id ya existente = DEBE (débito en cobros)
-- cuenta_haber_id (nueva)         = HABER predeterminado
-- IDEMPOTENTE
-- ============================================================================

ALTER TABLE caja_valores
  ADD COLUMN IF NOT EXISTS cuenta_haber_id UUID
    REFERENCES contabilidad_plan_cuentas(id) ON DELETE SET NULL;
