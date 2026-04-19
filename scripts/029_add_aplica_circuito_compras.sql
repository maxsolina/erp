-- 029_add_aplica_circuito_compras.sql
-- Agrega columna aplica_circuito_compras a categorias_proveedor.
-- Cuando es true, las facturas de compra de proveedores en esa categoría
-- solo pueden imputar a la cuenta "PT en Tránsito" (código 11050301).

ALTER TABLE categorias_proveedor
  ADD COLUMN IF NOT EXISTS aplica_circuito_compras BOOLEAN NOT NULL DEFAULT false;
