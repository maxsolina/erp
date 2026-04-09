-- ============================================================================
-- Conciliación Bancaria + Conciliación de Tarjetas
-- Módulo Finanzas → Banco y Caja / Conciliación de Tarjetas
-- Prerequisito: todas las tablas previas (finanzas_01 a finanzas_06)
-- ============================================================================

-- ─── Agregar campos a movimientos_banco ─────────────────────────────────────
ALTER TABLE movimientos_banco
  ADD COLUMN IF NOT EXISTS numero_operacion VARCHAR(100),
  ADD COLUMN IF NOT EXISTS fecha_operacion DATE,
  ADD COLUMN IF NOT EXISTS chequera VARCHAR(100),
  ADD COLUMN IF NOT EXISTS numero_cheque VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMPTZ DEFAULT now();

-- ─── Conciliaciones Bancarias ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conciliaciones_bancarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id),
  cuenta_bancaria_nombre VARCHAR(100),
  fecha_desde DATE,
  fecha_hasta DATE,
  tipo_fecha VARCHAR(30) DEFAULT 'fecha_operacion'
    CHECK (tipo_fecha IN ('fecha_operacion', 'fecha_creacion')),
  sucursales JSONB DEFAULT '[]',
  tipos_movimiento JSONB DEFAULT '[]',
  incluir_no_clasificados BOOLEAN DEFAULT true,
  saldo_entre_fechas DECIMAL(15,2) DEFAULT 0,
  saldo_actual DECIMAL(15,2) DEFAULT 0,
  total_conciliados DECIMAL(15,2) DEFAULT 0,
  total_no_conciliados DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Cupones de Tarjeta ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cupones_tarjeta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cupon VARCHAR(50),
  numero_lote VARCHAR(50),
  tarjeta_nombre VARCHAR(50),
  forma_pago_nombre VARCHAR(100),
  forma_pago_id UUID,
  cliente_id UUID,
  cliente_nombre VARCHAR(200),
  sucursal VARCHAR(50),
  extracto_id UUID REFERENCES extractos_caja(id),
  importe DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'ARS',
  fecha_ing_egr TIMESTAMPTZ DEFAULT now(),
  estado VARCHAR(20) DEFAULT 'en_cartera'
    CHECK (estado IN ('en_cartera', 'conciliado', 'rechazado', 'cancelado')),
  fecha_conciliacion TIMESTAMPTZ,
  conciliacion_id UUID,
  venta_id UUID,
  venta_numero VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Conciliaciones de Tarjetas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conciliaciones_tarjetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  grupo_tarjeta VARCHAR(100),
  liquidacion VARCHAR(100),
  fecha DATE NOT NULL,
  sucursal VARCHAR(50),
  importe_conciliado DECIMAL(15,2) DEFAULT 0,
  importe_cargos DECIMAL(15,2) DEFAULT 0,
  importe_total DECIMAL(15,2) DEFAULT 0,
  importe_cupones_rechazados DECIMAL(15,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'confirmado')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Cupones incluidos en una conciliación ──────────────────────────────────
CREATE TABLE IF NOT EXISTS conciliacion_tarjeta_cupones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conciliacion_id UUID REFERENCES conciliaciones_tarjetas(id) ON DELETE CASCADE,
  cupon_id UUID REFERENCES cupones_tarjeta(id),
  conciliado BOOLEAN DEFAULT false,
  rechazado BOOLEAN DEFAULT false
);

-- ─── Cargos de la conciliación de tarjetas ──────────────────────────────────
CREATE TABLE IF NOT EXISTS conciliacion_tarjeta_cargos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conciliacion_id UUID REFERENCES conciliaciones_tarjetas(id) ON DELETE CASCADE,
  descripcion VARCHAR(200),
  cuenta_contable VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL,
  impuestos DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL
);

-- ─── Secuencia y función para número de conciliación de tarjetas ────────────
CREATE SEQUENCE IF NOT EXISTS conciliaciones_tarjetas_seq START 600;

CREATE OR REPLACE FUNCTION generar_numero_conciliacion_tarjeta(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('conciliaciones_tarjetas_seq');
  RETURN 'CT X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conciliaciones_bancarias_cuenta ON conciliaciones_bancarias(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_cupones_tarjeta_estado ON cupones_tarjeta(estado);
CREATE INDEX IF NOT EXISTS idx_cupones_tarjeta_conciliacion ON cupones_tarjeta(conciliacion_id);
CREATE INDEX IF NOT EXISTS idx_conciliaciones_tarjetas_estado ON conciliaciones_tarjetas(estado);
CREATE INDEX IF NOT EXISTS idx_conciliacion_tarjeta_cupones_conc ON conciliacion_tarjeta_cupones(conciliacion_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_banco_conciliado ON movimientos_banco(conciliado);
CREATE INDEX IF NOT EXISTS idx_movimientos_banco_fecha_op ON movimientos_banco(fecha_operacion);
