-- 119_transferencia_caja_valores.sql
-- Multi-valor en Transferencia entre Cajas: una transferencia puede mover
-- varios valores físicos en simultáneo (efectivo, dólares, etc.).
--
-- Migración:
--   1. Crea tabla transferencia_caja_valores (id, transferencia_id, valor_id,
--      valor_nombre, importe, moneda).
--   2. Backfill: por cada fila existente en transferencias_caja, inserta una
--      fila en transferencia_caja_valores con los datos del único valor.
--   3. Hace nullable las columnas valor_id/valor_nombre/importe de la cabecera
--      (siguen existiendo por compatibilidad pero ya no son la fuente de
--      verdad — las líneas viven en la tabla nueva).

CREATE TABLE IF NOT EXISTS transferencia_caja_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transferencia_id UUID NOT NULL REFERENCES transferencias_caja(id) ON DELETE CASCADE,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  importe DECIMAL(15, 2) NOT NULL,
  moneda VARCHAR(10),
  comprobante_salida_id UUID,
  comprobante_entrada_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Idempotencia: si la tabla ya existía de migración anterior sin estas columnas,
-- las agregamos ahora.
ALTER TABLE transferencia_caja_valores ADD COLUMN IF NOT EXISTS moneda VARCHAR(10);
ALTER TABLE transferencia_caja_valores ADD COLUMN IF NOT EXISTS comprobante_salida_id UUID;
ALTER TABLE transferencia_caja_valores ADD COLUMN IF NOT EXISTS comprobante_entrada_id UUID;

CREATE INDEX IF NOT EXISTS idx_transferencia_caja_valores_transferencia ON transferencia_caja_valores(transferencia_id);

ALTER TABLE transferencia_caja_valores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transferencia_caja_valores' AND policyname = 'allow_all_authenticated') THEN
    CREATE POLICY allow_all_authenticated ON transferencia_caja_valores
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Backfill: pasar las filas existentes single-valor al nuevo modelo.
INSERT INTO transferencia_caja_valores (transferencia_id, valor_id, valor_nombre, importe, moneda)
SELECT tc.id, tc.valor_id, tc.valor_nombre, tc.importe, cv.moneda
FROM transferencias_caja tc
LEFT JOIN caja_valores cv ON cv.id = tc.valor_id
WHERE tc.valor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transferencia_caja_valores tcv WHERE tcv.transferencia_id = tc.id
  );

-- Hacer opcionales las columnas legacy.
ALTER TABLE transferencias_caja ALTER COLUMN valor_id DROP NOT NULL;
ALTER TABLE transferencias_caja ALTER COLUMN valor_nombre DROP NOT NULL;
ALTER TABLE transferencias_caja ALTER COLUMN importe DROP NOT NULL;
