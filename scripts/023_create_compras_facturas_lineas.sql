-- ============================================================================
-- 023_create_compras_facturas_lineas.sql
-- Tabla de líneas para facturas de compra (imputación por cuenta contable).
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS compras_facturas_lineas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id          INTEGER NOT NULL REFERENCES facturas_compra(id) ON DELETE CASCADE,
  cuenta_contable_id  UUID REFERENCES contabilidad_plan_cuentas(id) ON DELETE SET NULL,
  cuenta_codigo       TEXT,
  cuenta_nombre       TEXT,
  descripcion         TEXT,
  cantidad            NUMERIC(15,4) NOT NULL DEFAULT 1,
  precio_unitario     NUMERIC(15,4) NOT NULL DEFAULT 0,
  descuento_pct       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  alicuota_iva        NUMERIC(5,2)  NOT NULL DEFAULT 21,
  subtotal            NUMERIC(15,4) NOT NULL DEFAULT 0,
  iva                 NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_linea         NUMERIC(15,4) NOT NULL DEFAULT 0,
  orden               INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_facturas_lineas_factura_id
  ON compras_facturas_lineas(factura_id);

-- Agregar columnas extras a facturas_compra si no existen
ALTER TABLE facturas_compra
  ADD COLUMN IF NOT EXISTS cotizacion       NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS tipo_cotizacion  TEXT,
  ADD COLUMN IF NOT EXISTS sucursal         TEXT;
