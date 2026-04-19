-- 030_add_aplica_circuito_compras_proveedor.sql
-- Agrega columna aplica_circuito_compras a proveedores.
-- Cuando es true, las facturas de compra de ese proveedor
-- solo pueden imputar a la cuenta "PT en Tránsito" (código 11050301).

ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS aplica_circuito_compras BOOLEAN NOT NULL DEFAULT false;
