-- 031_circuito_compras_campos.sql
-- Agrega campos necesarios para el circuito de compras automático.
-- Los campos oc_id / orden_compra_id ya existen en ambas tablas.

-- facturas_compra: flag de generación automática
ALTER TABLE facturas_compra
  ADD COLUMN IF NOT EXISTS es_automatica BOOLEAN NOT NULL DEFAULT false;

-- recepciones: vínculo a la factura generada en el mismo circuito
ALTER TABLE recepciones
  ADD COLUMN IF NOT EXISTS factura_id INTEGER REFERENCES facturas_compra(id);
