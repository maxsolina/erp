ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS sucursal        TEXT,
  ADD COLUMN IF NOT EXISTS sucursal_id     INTEGER,
  ADD COLUMN IF NOT EXISTS deposito_destino     TEXT,
  ADD COLUMN IF NOT EXISTS deposito_destino_id  INTEGER,
  ADD COLUMN IF NOT EXISTS ubicacion       TEXT;
