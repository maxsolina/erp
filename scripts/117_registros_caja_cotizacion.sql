-- 117_registros_caja_cotizacion.sql
-- Agrega columnas cotizacion + tipo_cotizacion a registros_caja y registros_banco
-- para que los registros en moneda distinta a ARS queden con la cotización al
-- momento del registro (necesario para convertir a ARS en los asientos contables).

ALTER TABLE registros_caja
  ADD COLUMN IF NOT EXISTS cotizacion DECIMAL(15, 4),
  ADD COLUMN IF NOT EXISTS tipo_cotizacion VARCHAR(40);

ALTER TABLE registros_banco
  ADD COLUMN IF NOT EXISTS cotizacion DECIMAL(15, 4),
  ADD COLUMN IF NOT EXISTS tipo_cotizacion VARCHAR(40);
