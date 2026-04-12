-- ============================================================================
-- Alterar tablas existentes para vincular con OTs del Taller
-- Agregar ot_id (FK nullable) a comprobantes existentes
-- ============================================================================

ALTER TABLE notas_venta
  ADD COLUMN IF NOT EXISTS ot_id UUID REFERENCES taller_ordenes_trabajo(id);

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS ot_id UUID REFERENCES taller_ordenes_trabajo(id);

ALTER TABLE remitos
  ADD COLUMN IF NOT EXISTS ot_id UUID REFERENCES taller_ordenes_trabajo(id);

ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS ot_id UUID REFERENCES taller_ordenes_trabajo(id);

ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS ot_id UUID REFERENCES taller_ordenes_trabajo(id);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_notas_venta_ot ON notas_venta(ot_id);
CREATE INDEX IF NOT EXISTS idx_facturas_ot ON facturas(ot_id);
CREATE INDEX IF NOT EXISTS idx_remitos_ot ON remitos(ot_id);
CREATE INDEX IF NOT EXISTS idx_recibos_ot ON recibos(ot_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_ot ON ordenes_compra(ot_id);
