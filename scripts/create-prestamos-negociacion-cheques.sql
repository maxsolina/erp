-- ============================================================================
-- Préstamos + Negociación de Cheques
-- Módulo Finanzas → Operaciones Financieras
-- Prerequisito: cajas, caja_valores, extractos_caja, movimientos_caja,
--               cuentas_bancarias, movimientos_banco
-- ============================================================================

-- ─── Tipos de Préstamo ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipos_prestamo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  cuenta_prestamo VARCHAR(100),
  cuenta_intereses VARCHAR(100),
  cuenta_intereses_devengar VARCHAR(100),
  cuenta_iva_devengar VARCHAR(100),
  cuenta_percepciones_devengar VARCHAR(100),
  cuenta_refinanciacion VARCHAR(100),
  cuenta_preexistente VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO tipos_prestamo (nombre, cuenta_prestamo, cuenta_intereses, cuenta_refinanciacion, cuenta_preexistente) VALUES
  ('SGR', '21010705 Préstamo SGR', '62010103 Intereses Préstamos Bancarios Recibidos',
   '99999998 Cuenta Puente para Movimientos Bancarios', '21010704 Préstamos Bancarios')
ON CONFLICT DO NOTHING;

-- ─── Préstamos ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prestamos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  tipo_id UUID REFERENCES tipos_prestamo(id),
  tipo_nombre VARCHAR(100),
  entidad_id UUID,
  entidad_nombre VARCHAR(100),
  nro_prestamo VARCHAR(100),
  moneda VARCHAR(10) DEFAULT 'ARS',
  capital DECIMAL(15,2) NOT NULL,
  tasa_porcentaje DECIMAL(8,4),
  capital_pendiente DECIMAL(15,2),
  intereses_total DECIMAL(15,2),
  iva DECIMAL(15,2) DEFAULT 0,
  percepcion_iva DECIMAL(15,2) DEFAULT 0,
  percepcion_iibb DECIMAL(15,2) DEFAULT 0,
  otros_gastos DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2),
  saldo DECIMAL(15,2),
  fecha DATE NOT NULL,
  sucursal VARCHAR(50),
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  sistema_amortizacion VARCHAR(20) NOT NULL
    CHECK (sistema_amortizacion IN ('frances', 'aleman', 'americano', 'bullet')),
  es_preexistente BOOLEAN DEFAULT false,
  cantidad_cuotas INTEGER NOT NULL,
  periodicidad VARCHAR(20) DEFAULT 'mensual'
    CHECK (periodicidad IN ('mensual', 'trimestral', 'semestral', 'anual')),
  fecha_primera_cuota DATE,
  importe_refinanciado DECIMAL(15,2) DEFAULT 0,
  importe_acreditado DECIMAL(15,2),
  tipo_garante VARCHAR(50),
  garante VARCHAR(100),
  forma_pago VARCHAR(50),
  tipo_tasa VARCHAR(50),
  distribucion_pago VARCHAR(50) DEFAULT 'Proporcional',
  periodo_gracia INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'pendiente', 'cerrado', 'cancelado')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Cuotas del Préstamo ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prestamo_cuotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prestamo_id UUID REFERENCES prestamos(id) ON DELETE CASCADE,
  numero_cuota INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  capital DECIMAL(15,2) NOT NULL,
  interes DECIMAL(15,2) NOT NULL,
  iva DECIMAL(15,2) DEFAULT 0,
  percepciones DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  saldo DECIMAL(15,2),
  estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'conciliado', 'vencido')),
  fecha_pago DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Pagos del Préstamo ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prestamo_pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prestamo_id UUID REFERENCES prestamos(id) ON DELETE CASCADE,
  cuota_id UUID REFERENCES prestamo_cuotas(id),
  fecha DATE NOT NULL,
  importe DECIMAL(15,2) NOT NULL,
  caja_id UUID REFERENCES cajas(id),
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id),
  documento_origen_tipo VARCHAR(50),
  documento_origen_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Gastos del Préstamo ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prestamo_gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prestamo_id UUID REFERENCES prestamos(id) ON DELETE CASCADE,
  descripcion VARCHAR(200),
  importe DECIMAL(15,2) NOT NULL,
  cuenta_contable VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS prestamos_seq START 1;
CREATE OR REPLACE FUNCTION generar_numero_prestamo(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('prestamos_seq');
  RETURN 'PRES X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Cheques de Terceros ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cheques_terceros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cheque VARCHAR(50) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  origen_tipo VARCHAR(50),
  origen_id UUID,
  origen_nombre VARCHAR(200),
  banco_nombre VARCHAR(100),
  banco_codigo VARCHAR(10),
  serie VARCHAR(10),
  es_electronico BOOLEAN DEFAULT true,
  es_propio BOOLEAN DEFAULT false,
  es_endosable BOOLEAN DEFAULT true,
  importe DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'ARS',
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  extracto_id UUID REFERENCES extractos_caja(id),
  fecha_ingreso TIMESTAMPTZ DEFAULT now(),
  fecha_egreso TIMESTAMPTZ,
  destino_tipo VARCHAR(50),
  destino_nombre VARCHAR(100),
  estado VARCHAR(30) DEFAULT 'en_cartera'
    CHECK (estado IN ('en_cartera', 'negociado', 'depositado',
                      'endosado', 'rechazado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Negociaciones de Cheques ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS negociaciones_cheques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  tipo_acreditacion VARCHAR(20) DEFAULT 'neto'
    CHECK (tipo_acreditacion IN ('neto', 'bruto')),
  total_negociado DECIMAL(15,2) DEFAULT 0,
  total_gastos DECIMAL(15,2) DEFAULT 0,
  total_recibido DECIMAL(15,2) DEFAULT 0,
  fecha DATE NOT NULL,
  sucursal VARCHAR(50),
  destino_tipo VARCHAR(20) CHECK (destino_tipo IN ('banco', 'proveedor')),
  proveedor_id UUID,
  proveedor_nombre VARCHAR(100),
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id),
  cuenta_bancaria_nombre VARCHAR(100),
  estado VARCHAR(30) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'en_negociacion', 'cobranza',
                      'liquidacion', 'finalizada', 'cancelada')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Items de Negociación ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS negociacion_cheques_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negociacion_id UUID REFERENCES negociaciones_cheques(id) ON DELETE CASCADE,
  cheque_id UUID REFERENCES cheques_terceros(id),
  valor_nombre VARCHAR(100),
  valor_id UUID REFERENCES caja_valores(id),
  importe DECIMAL(15,2) NOT NULL
);

-- ─── Cheques Devueltos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS negociacion_cheques_devueltos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negociacion_id UUID REFERENCES negociaciones_cheques(id) ON DELETE CASCADE,
  cheque_id UUID REFERENCES cheques_terceros(id),
  motivo_rechazo VARCHAR(200),
  fecha_rechazo DATE,
  nd_generada_id UUID
);

-- ─── Gastos de Negociación ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS negociacion_gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negociacion_id UUID REFERENCES negociaciones_cheques(id) ON DELETE CASCADE,
  tipo VARCHAR(50) DEFAULT 'Cuenta Contable',
  cuenta_contable VARCHAR(100),
  cuenta_analitica VARCHAR(100),
  descripcion VARCHAR(200),
  importe DECIMAL(15,2) NOT NULL,
  impuestos DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'ARS'
);

-- ─── Valores de Acreditación ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS negociacion_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negociacion_id UUID REFERENCES negociaciones_cheques(id) ON DELETE CASCADE,
  nombre VARCHAR(200),
  importe_comprobante DECIMAL(15,2),
  moneda_comprobante VARCHAR(10),
  importe DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(10)
);

-- ─── Notas de Débito por Cheque Rechazado ───────────────────────────────────
CREATE TABLE IF NOT EXISTS notas_debito_cheque_rechazado (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  negociacion_id UUID REFERENCES negociaciones_cheques(id),
  cheque_id UUID REFERENCES cheques_terceros(id),
  cliente_nombre VARCHAR(100),
  importe_cheque DECIMAL(15,2) NOT NULL,
  gastos_bancarios DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  fecha DATE NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'cobrada', 'incobrable')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS negociaciones_seq START 1;
CREATE OR REPLACE FUNCTION generar_numero_negociacion(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('negociaciones_seq');
  RETURN 'NCHQ X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
CREATE INDEX IF NOT EXISTS idx_prestamo_cuotas_prestamo ON prestamo_cuotas(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_prestamo_cuotas_estado ON prestamo_cuotas(estado);
CREATE INDEX IF NOT EXISTS idx_cheques_terceros_estado ON cheques_terceros(estado);
CREATE INDEX IF NOT EXISTS idx_cheques_terceros_caja ON cheques_terceros(caja_id);
CREATE INDEX IF NOT EXISTS idx_negociaciones_estado ON negociaciones_cheques(estado);
