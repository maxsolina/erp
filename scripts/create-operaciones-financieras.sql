-- ============================================================================
-- Operaciones Financieras: Depósitos, Extracciones, Transferencias Bancarias,
-- Conversión de Monedas
-- Módulo Finanzas → Operaciones Financieras
-- Prerequisito: cajas, caja_valores, extractos_caja, movimientos_caja,
--               transferencias_caja
-- ============================================================================

-- ─── Cuentas Bancarias ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuentas_bancarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cuenta VARCHAR(50) NOT NULL,
  cbu VARCHAR(22),
  banco_nombre VARCHAR(100) NOT NULL,
  tipo_cuenta VARCHAR(30) DEFAULT 'cuenta_corriente'
    CHECK (tipo_cuenta IN ('cuenta_corriente', 'caja_ahorro')),
  moneda VARCHAR(10) DEFAULT 'ARS',
  propietario VARCHAR(100),
  diario_nombre VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO cuentas_bancarias (numero_cuenta, cbu, banco_nombre, tipo_cuenta, moneda, diario_nombre) VALUES
  ('334009419782888', null, 'Banco Macro S.A.', 'cuenta_corriente', 'ARS', 'Banco Macro CC (ARS)'),
  ('6546225', null, 'Banco De Galicia Y Buenos Aires S.A.', 'cuenta_corriente', 'ARS', 'Banco Galicia CC (ARS)'),
  ('011', null, 'Banco De La Nacion Argentina', 'cuenta_corriente', 'ARS', 'Banco Nación CC (ARS)'),
  ('123456-55', null, 'Wallet Crypto', 'cuenta_corriente', 'USD', 'Wallet Crypto (USD)'),
  ('654654', null, 'JP Morgan Chase CO', 'cuenta_corriente', 'USD', 'JP Morgan (USD)'),
  ('1359810', null, 'Relay Banc', 'cuenta_corriente', 'USD', 'Relay Banc (USD)')
ON CONFLICT DO NOTHING;

-- ─── Movimientos Bancarios ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos_banco (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id),
  cuenta_bancaria_nombre VARCHAR(100),
  tipo_movimiento VARCHAR(10) CHECK (tipo_movimiento IN ('ingreso', 'egreso')),
  importe DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(10),
  tipo_operacion VARCHAR(50),
  numero_operacion VARCHAR(100),
  fecha_operacion DATE,
  concepto VARCHAR(200),
  documento_origen_tipo VARCHAR(50),
  documento_origen_id UUID,
  documento_origen_numero VARCHAR(50),
  conciliado BOOLEAN DEFAULT false,
  fecha_conciliacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_banco_cuenta ON movimientos_banco(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_banco_conciliado ON movimientos_banco(conciliado);

-- ─── Depósitos Bancarios ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS depositos_bancarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id),
  cuenta_bancaria_nombre VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL,
  sucursal VARCHAR(50),
  caja_egreso_id UUID REFERENCES cajas(id),
  caja_egreso_nombre VARCHAR(100),
  tipo_operacion VARCHAR(50) DEFAULT 'Depósito',
  numero_operacion VARCHAR(100),
  fecha_operacion DATE,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'deposito_pendiente', 'publicado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deposito_bancario_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deposito_id UUID REFERENCES depositos_bancarios(id) ON DELETE CASCADE,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS depositos_bancarios_seq START 300;
CREATE OR REPLACE FUNCTION generar_numero_deposito_bancario(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('depositos_bancarios_seq');
  RETURN 'DEP X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Extracciones ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extracciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id),
  cuenta_bancaria_nombre VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL,
  sucursal VARCHAR(50),
  caja_ingreso_id UUID REFERENCES cajas(id),
  caja_ingreso_nombre VARCHAR(100),
  tipo_operacion VARCHAR(50) DEFAULT 'Extracción',
  numero_operacion VARCHAR(100),
  fecha_operacion DATE,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'publicado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extraccion_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extraccion_id UUID REFERENCES extracciones(id) ON DELETE CASCADE,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS extracciones_seq START 200;
CREATE OR REPLACE FUNCTION generar_numero_extraccion(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('extracciones_seq');
  RETURN 'EXT X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Transferencias Bancarias ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transferencias_bancarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  desde_cuenta_id UUID REFERENCES cuentas_bancarias(id),
  desde_cuenta_nombre VARCHAR(100),
  hasta_cuenta_id UUID REFERENCES cuentas_bancarias(id),
  hasta_cuenta_nombre VARCHAR(100),
  sucursal VARCHAR(50),
  importe_origen DECIMAL(15,2) NOT NULL,
  tipo_operacion_origen VARCHAR(50) DEFAULT 'Transferencia',
  numero_operacion_origen VARCHAR(100),
  fecha_operacion_origen DATE,
  tipo_operacion_destino VARCHAR(50) DEFAULT 'Transferencia',
  numero_operacion_destino VARCHAR(100),
  fecha_operacion_destino DATE,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'publicado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS transf_bancarias_seq START 90;
CREATE OR REPLACE FUNCTION generar_numero_transf_bancaria(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('transf_bancarias_seq');
  RETURN 'TB X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Conversiones de Moneda ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversiones_moneda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  sucursal VARCHAR(50),
  valor_origen_id UUID REFERENCES caja_valores(id),
  valor_origen_nombre VARCHAR(100),
  moneda_origen VARCHAR(10),
  importe_origen DECIMAL(15,2) NOT NULL,
  valor_destino_id UUID REFERENCES caja_valores(id),
  valor_destino_nombre VARCHAR(100),
  moneda_destino VARCHAR(10),
  importe_destino DECIMAL(15,2) NOT NULL,
  tipo_cotizacion VARCHAR(50),
  cotizacion DECIMAL(15,4) NOT NULL,
  diferencia_redondeo DECIMAL(15,2) DEFAULT 0,
  fecha DATE NOT NULL,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'publicado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS conversiones_seq START 900;
CREATE OR REPLACE FUNCTION generar_numero_conversion(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('conversiones_seq');
  RETURN 'CD X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Índices adicionales ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_depositos_bancarios_estado ON depositos_bancarios(estado);
CREATE INDEX IF NOT EXISTS idx_extracciones_estado ON extracciones(estado);
CREATE INDEX IF NOT EXISTS idx_transf_bancarias_estado ON transferencias_bancarias(estado);
CREATE INDEX IF NOT EXISTS idx_conversiones_estado ON conversiones_moneda(estado);
