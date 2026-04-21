-- 064: Agregar campos de reserva por Nota de Venta a stock_unidades
-- Propósito: Permite vincular una unidad de stock (IMEI/serie) a la NV que la reserva,
--            habilitando el flujo: crear NV → reservar unidades → generar OE/remito → entregar
-- Idempotente: usa IF NOT EXISTS
-- Fecha: 2025

-- 1. Agregar columna nota_venta_id (FK blanda, sin FK forzada para evitar dependencia circular)
ALTER TABLE stock_unidades
  ADD COLUMN IF NOT EXISTS nota_venta_id   INTEGER,
  ADD COLUMN IF NOT EXISTS nota_venta_numero TEXT;

-- 2. Índice para consulta eficiente por NV
CREATE INDEX IF NOT EXISTS idx_stock_unidades_nota_venta
  ON stock_unidades(nota_venta_id)
  WHERE nota_venta_id IS NOT NULL;

-- 3. Índice compuesto para la consulta "stock reservado de esta NV"
CREATE INDEX IF NOT EXISTS idx_stock_unidades_nv_estado
  ON stock_unidades(nota_venta_id, estado)
  WHERE nota_venta_id IS NOT NULL;

-- Verificar resultado
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'stock_unidades' AND column_name IN ('nota_venta_id', 'nota_venta_numero');
