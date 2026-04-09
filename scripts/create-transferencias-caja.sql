-- ============================================================================
-- Transferencias de Caja
-- Módulo Finanzas → Banco y Caja → Transferencias de Caja
-- Prerequisito: cajas, caja_valores, extractos_caja, movimientos_caja
-- ============================================================================

-- ─── Agregar estado_movimiento a movimientos_caja ───────────────────────────
ALTER TABLE movimientos_caja
  ADD COLUMN IF NOT EXISTS estado_movimiento VARCHAR(20) DEFAULT 'confirmado';

-- Agregar CHECK constraint (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimientos_caja_estado_movimiento_check'
  ) THEN
    ALTER TABLE movimientos_caja
      ADD CONSTRAINT movimientos_caja_estado_movimiento_check
      CHECK (estado_movimiento IN ('confirmado', 'pendiente', 'cancelado'));
  END IF;
END $$;

-- ─── Tabla principal de transferencias de caja ──────────────────────────────
CREATE TABLE IF NOT EXISTS transferencias_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  sucursal VARCHAR(50),
  caja_desde_id UUID REFERENCES cajas(id),
  caja_desde_nombre VARCHAR(100),
  caja_hasta_id UUID REFERENCES cajas(id),
  caja_hasta_nombre VARCHAR(100),
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL,
  concepto VARCHAR(100) DEFAULT 'Transferencia',
  fecha DATE NOT NULL,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'pendiente', 'publicado', 'cancelado')),
  comprobante_salida_id UUID,
  comprobante_entrada_id UUID,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Líneas de valores transferidos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transferencia_caja_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transferencia_id UUID REFERENCES transferencias_caja(id) ON DELETE CASCADE,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL
);

-- ─── Secuencia y función de numeración ──────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS transferencias_caja_seq START 8000;

CREATE OR REPLACE FUNCTION generar_numero_transferencia_caja(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('transferencias_caja_seq');
  RETURN 'TRC X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transferencias_caja_estado ON transferencias_caja(estado);
CREATE INDEX IF NOT EXISTS idx_transferencias_caja_desde ON transferencias_caja(caja_desde_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_caja_hasta ON transferencias_caja(caja_hasta_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_estado ON movimientos_caja(estado_movimiento);
