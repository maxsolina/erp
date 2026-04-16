-- ============================================================================
-- 024_create_categorias_proveedor_cuentas.sql
-- Tabla pivot: cuentas contables permitidas por categoría de proveedor.
-- Al cargar una factura de compra, el selector de cuenta contable de cada
-- línea muestra SOLO las cuentas de esta lista (si está configurada).
-- Si la lista está vacía → se muestran todas las cuentas del plan.
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS categorias_proveedor_cuentas (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id INTEGER NOT NULL
    REFERENCES categorias_proveedor(id) ON DELETE CASCADE,
  cuenta_id  UUID    NOT NULL
    REFERENCES contabilidad_plan_cuentas(id) ON DELETE CASCADE,
  UNIQUE (categoria_id, cuenta_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cat_prov_cuentas_categoria
  ON categorias_proveedor_cuentas (categoria_id);
