-- ============================================================================
-- Registros de Caja + Ajustes de Caja + Registros de Banco + Ajustes de Banco
-- Módulo Finanzas → Banco y Caja
-- Prerequisito: cajas, caja_valores, extractos_caja, movimientos_caja
-- ============================================================================

-- ─── Conceptos de Registros de Caja ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conceptos_registro_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  cuenta_contable_ingresos VARCHAR(100),
  cuenta_contable_egresos VARCHAR(100),
  requiere_observacion BOOLEAN DEFAULT false,
  visible_en_banco BOOLEAN DEFAULT false,
  visible_en_caja BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO conceptos_registro_caja (codigo, nombre, cuenta_contable_egresos, requiere_observacion) VALUES
  ('COM', 'Comidas', '53010803 Gastos de Oficina', false),
  ('GASLB', 'Gtos. Librería', '53010801 Gastos Librería', false),
  ('CADE', 'Cadetes', '42010217 Cadetería', false),
  ('GASLIM', 'Gtos. Limpieza', '53010802 Gastos Limpieza', false),
  ('INSPEGTOR', 'Insumos (peg/torn)', null, false),
  ('RETSOCMS', 'Retiro Socio Max S.', '11040301 Cuenta Particular Solina Max', true),
  ('GASOFIC', 'Gastos de Oficina', null, false),
  ('COMVENT', 'Comisiones por Ventas', '42010203 Comisiones por Ventas', false),
  ('SUPER', 'Supermercado', '53010803 Gastos de Oficina', false),
  ('DifCaja', 'Diferencia de Caja', '53010702 Diferencias de Caja', true),
  ('PRO', 'Prestamos Otorgados', '11040407 Préstamos Obtenidos', true),
  ('PrestObt', 'Prestamos Obtenidos', '11040407 Préstamos Obtenidos', true),
  ('DevVta', 'Devolución Venta', '41010101 Ventas Mercadería', true),
  ('PRESTALTA', 'Alta Prestamos', '88888888 Cuenta Puente Para Prestamos', true)
ON CONFLICT (codigo) DO NOTHING;

-- Marcar conceptos visibles en banco
UPDATE conceptos_registro_caja SET visible_en_banco = true
WHERE codigo IN ('RETSOCMS', 'PrestObt', 'DifCaja', 'PRESTALTA');

-- ─── Registros de Caja ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  sucursal VARCHAR(50),
  concepto_id UUID REFERENCES conceptos_registro_caja(id),
  concepto_nombre VARCHAR(100),
  moneda VARCHAR(10) DEFAULT 'ARS',
  total_comprobantes DECIMAL(15,2) DEFAULT 0,
  total_valores DECIMAL(15,2) DEFAULT 0,
  fecha DATE NOT NULL,
  fecha_probable_pago DATE,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'confirmado')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registro_caja_comprobantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES registros_caja(id) ON DELETE CASCADE,
  tipo VARCHAR(50) DEFAULT 'Cuenta Contable',
  comprobante VARCHAR(100),
  proveedor_id UUID,
  proveedor_nombre VARCHAR(100),
  descripcion TEXT,
  cuenta_contable VARCHAR(100),
  cuenta_analitica VARCHAR(100),
  importe DECIMAL(15,2) DEFAULT 0,
  impuestos DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registro_caja_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES registros_caja(id) ON DELETE CASCADE,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  importe_comprobante DECIMAL(15,2) DEFAULT 0,
  moneda_comprobante VARCHAR(10),
  importe DECIMAL(15,2) DEFAULT 0,
  moneda VARCHAR(10)
);

CREATE SEQUENCE IF NOT EXISTS registros_caja_seq START 3000;
CREATE OR REPLACE FUNCTION generar_numero_registro_caja(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda' THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('registros_caja_seq');
  RETURN 'RC X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Ajustes de Caja ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ajustes_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  concepto_id UUID REFERENCES conceptos_registro_caja(id),
  concepto_nombre VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  tipo_ajuste VARCHAR(10) CHECK (tipo_ajuste IN ('ingreso', 'egreso')),
  fecha DATE NOT NULL,
  sucursal VARCHAR(50),
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  cuenta_analitica VARCHAR(100),
  es_automatico BOOLEAN DEFAULT false,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS ajustes_caja_seq START 1000;
CREATE OR REPLACE FUNCTION generar_numero_ajuste_caja(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda' THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('ajustes_caja_seq');
  RETURN 'AJ X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Registros de Banco ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_banco (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  cuenta_bancaria_id UUID,
  cuenta_bancaria_nombre VARCHAR(100),
  sucursal VARCHAR(50),
  concepto_id UUID REFERENCES conceptos_registro_caja(id),
  concepto_nombre VARCHAR(100),
  moneda VARCHAR(10) DEFAULT 'ARS',
  total_comprobantes DECIMAL(15,2) DEFAULT 0,
  total_valores DECIMAL(15,2) DEFAULT 0,
  fecha DATE NOT NULL,
  fecha_probable_pago DATE,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'confirmado')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registro_banco_comprobantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES registros_banco(id) ON DELETE CASCADE,
  tipo VARCHAR(50) DEFAULT 'Cuenta Contable',
  comprobante VARCHAR(100),
  proveedor_nombre VARCHAR(100),
  descripcion TEXT,
  cuenta_contable VARCHAR(100),
  cuenta_analitica VARCHAR(100),
  importe DECIMAL(15,2) DEFAULT 0,
  impuestos DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registro_banco_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID REFERENCES registros_banco(id) ON DELETE CASCADE,
  nombre VARCHAR(100),
  importe_comprobante DECIMAL(15,2) DEFAULT 0,
  moneda_comprobante VARCHAR(10),
  importe DECIMAL(15,2) DEFAULT 0,
  moneda VARCHAR(10)
);

CREATE SEQUENCE IF NOT EXISTS registros_banco_seq START 3000;
CREATE OR REPLACE FUNCTION generar_numero_registro_banco(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda' THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('registros_banco_seq');
  RETURN 'RB X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Ajustes de Banco ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ajustes_banco (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  cuenta_bancaria_id UUID,
  cuenta_bancaria_nombre VARCHAR(100),
  concepto_id UUID REFERENCES conceptos_registro_caja(id),
  concepto_nombre VARCHAR(100),
  importe DECIMAL(15,2) NOT NULL,
  fecha DATE NOT NULL,
  sucursal VARCHAR(50),
  cuenta_analitica VARCHAR(100),
  observaciones TEXT,
  estado VARCHAR(30) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'ajuste_pendiente', 'publicado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS ajustes_banco_seq START 1000;
CREATE OR REPLACE FUNCTION generar_numero_ajuste_banco(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda' THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('ajustes_banco_seq');
  RETURN 'AB X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;
