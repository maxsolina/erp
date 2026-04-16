-- Agrega campo cuenta de gastos por defecto al proveedor
-- Permite pre-restringir el selector de cuentas en facturas de compra

ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS cuenta_gastos_defecto      UUID        REFERENCES contabilidad_plan_cuentas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cuenta_gastos_defecto_codigo TEXT       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cuenta_gastos_defecto_nombre TEXT       DEFAULT NULL;
