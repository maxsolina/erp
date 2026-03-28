-- Tabla de categorías para Notas de Crédito
CREATE TABLE IF NOT EXISTS nc_categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columna categoria en ajustes_clientes (Notas de Crédito / Débito)
ALTER TABLE ajustes_clientes
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT NULL;
