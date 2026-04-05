-- Agrega columnas subtotal e impuestos a la tabla notas_venta
ALTER TABLE notas_venta
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impuestos numeric NOT NULL DEFAULT 0;

-- Actualizar los registros existentes: recalcular subtotal desde las líneas
-- e impuestos como 21% del subtotal
UPDATE notas_venta nv
SET
  subtotal = COALESCE((
    SELECT SUM(l.subtotal)
    FROM notas_venta_lineas l
    WHERE l.nota_venta_id = nv.id
  ), 0),
  impuestos = COALESCE((
    SELECT SUM(l.subtotal) * 0.21
    FROM notas_venta_lineas l
    WHERE l.nota_venta_id = nv.id
  ), 0);
