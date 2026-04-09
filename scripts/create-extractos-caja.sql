-- ============================================================================
-- Extractos de Caja + Movimientos — Módulo Finanzas
-- Prerequisito: tablas cajas y caja_valores deben existir
-- ============================================================================

-- Tabla principal de extractos
CREATE TABLE IF NOT EXISTS extractos_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  sucursal VARCHAR(50),
  responsable_id UUID,
  responsable_nombre VARCHAR(100),
  fecha_apertura TIMESTAMPTZ DEFAULT now(),
  fecha_cierre TIMESTAMPTZ,
  estado VARCHAR(20) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de saldos por valor dentro del extracto
CREATE TABLE IF NOT EXISTS extracto_saldos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extracto_id UUID REFERENCES extractos_caja(id) ON DELETE CASCADE,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  valor_codigo VARCHAR(20),
  moneda VARCHAR(10),
  saldo_apertura DECIMAL(15,2) DEFAULT 0,
  saldo_cierre_ingresado DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de movimientos de caja (integración con todos los módulos)
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extracto_id UUID REFERENCES extractos_caja(id),
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  tipo_movimiento VARCHAR(10) CHECK (tipo_movimiento IN ('ingreso', 'egreso')),
  importe DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(10),
  concepto VARCHAR(200),
  documento_origen_tipo VARCHAR(50),
  documento_origen_id UUID,
  documento_origen_numero VARCHAR(50),
  fecha TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_movimientos_extracto ON movimientos_caja(extracto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_valor ON movimientos_caja(valor_id);

-- Secuencia para numeración de extractos
CREATE SEQUENCE IF NOT EXISTS extractos_numero_seq START 3000;

-- Función para generar número de extracto automáticamente
CREATE OR REPLACE FUNCTION generar_numero_extracto(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_codigo VARCHAR(5);
  v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000'
  END;
  v_numero := nextval('extractos_numero_seq');
  RETURN 'EC X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;
