-- ============================================================================
-- Tabla de líneas de valores para Ajustes de Caja (multi-medio de pago)
-- Prerequisito: ajustes_caja, caja_valores
-- Idempotente: seguro re-ejecutar
-- ============================================================================

CREATE TABLE IF NOT EXISTS ajuste_caja_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ajuste_id UUID NOT NULL REFERENCES ajustes_caja(id) ON DELETE CASCADE,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  tipo_movimiento VARCHAR(10) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida')),
  importe DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ajuste_caja_valores_ajuste_id ON ajuste_caja_valores(ajuste_id);

-- Hacer opcionales las columnas del diseño anterior (single-valor)
ALTER TABLE ajustes_caja ALTER COLUMN valor_id DROP NOT NULL;
ALTER TABLE ajustes_caja ALTER COLUMN valor_nombre DROP NOT NULL;
ALTER TABLE ajustes_caja ALTER COLUMN tipo_ajuste DROP NOT NULL;
