-- ============================================================================
-- ÓRDENES DE PAGO V2 - Tablas para el módulo de Compras
-- Ejecutar completo en Supabase SQL Editor.
-- ============================================================================

-- Secuencia para numeración
CREATE SEQUENCE IF NOT EXISTS compras_op_seq START 1;

-- Tabla principal: compras_ordenes_pago
CREATE TABLE IF NOT EXISTS compras_ordenes_pago (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  sucursal_id UUID,
  sucursal_nombre VARCHAR(100),
  proveedor_id INTEGER NOT NULL,
  proveedor_nombre VARCHAR(200) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  moneda VARCHAR(10) NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD','EUR')),
  tipo_cotizacion VARCHAR(20) CHECK (tipo_cotizacion IN ('oficial','blue','mep')),
  cotizacion DECIMAL(15,4),
  importe DECIMAL(15,2) NOT NULL DEFAULT 0,
  importe_ars DECIMAL(15,2) DEFAULT 0,
  importe_a_cuenta DECIMAL(15,2) DEFAULT 0,
  importe_no_conciliado DECIMAL(15,2) DEFAULT 0,
  concepto TEXT,
  orden_compra_id INTEGER,
  orden_compra_numero TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','publicado','cancelado')),
  periodo VARCHAR(7),
  observaciones TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de medios de pago
CREATE TABLE IF NOT EXISTS compras_op_medios_pago (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  op_id UUID NOT NULL REFERENCES compras_ordenes_pago(id) ON DELETE CASCADE,
  nombre TEXT,
  forma_pago_id UUID,
  forma_pago_nombre VARCHAR(100),
  tipo_operacion VARCHAR(50),
  tipo_cotizacion VARCHAR(20) CHECK (tipo_cotizacion IN ('oficial','blue','mep')),
  cotizacion DECIMAL(15,4),
  numero_operacion VARCHAR(100),
  fecha_operacion DATE,
  importe DECIMAL(15,2) NOT NULL DEFAULT 0,
  moneda VARCHAR(10) DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD','EUR')),
  importe_comp DECIMAL(15,2) DEFAULT 0,
  moneda_comp VARCHAR(10) DEFAULT 'ARS',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de comprobantes vinculados
CREATE TABLE IF NOT EXISTS compras_op_comprobantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  op_id UUID NOT NULL REFERENCES compras_ordenes_pago(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('debito','credito')),
  factura_id INTEGER,
  referencia VARCHAR(100),
  fecha DATE,
  vencimiento DATE,
  saldo_mon DECIMAL(15,2) DEFAULT 0,
  moneda_comp VARCHAR(10) DEFAULT 'ARS',
  tipo_cotizacion VARCHAR(20),
  cotizacion_original DECIMAL(15,4),
  saldo_original DECIMAL(15,2) DEFAULT 0,
  cotizacion DECIMAL(15,4),
  importe_en_liquidacion DECIMAL(15,2),
  saldo DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  importe DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Función para generar número de OP
CREATE OR REPLACE FUNCTION generar_numero_op()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_numero INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_numero := nextval('compras_op_seq');
  RETURN 'OP-' || v_year || '-' || LPAD(v_numero::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Índices
CREATE INDEX IF NOT EXISTS idx_compras_op_proveedor ON compras_ordenes_pago(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_op_estado ON compras_ordenes_pago(estado);
CREATE INDEX IF NOT EXISTS idx_compras_op_fecha ON compras_ordenes_pago(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_op_medios_op ON compras_op_medios_pago(op_id);
CREATE INDEX IF NOT EXISTS idx_compras_op_compr_op ON compras_op_comprobantes(op_id);
