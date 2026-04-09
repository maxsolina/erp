-- ============================================================================
-- RECIBOS — Ventas → Cobranzas → Recibos
-- ============================================================================

-- Tabla principal de Recibos
CREATE TABLE IF NOT EXISTS recibos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL UNIQUE,
  sucursal VARCHAR(50) NOT NULL,
  cliente_id UUID,
  cliente_nombre VARCHAR(200),
  caja_id UUID REFERENCES cajas(id),
  caja_nombre VARCHAR(100),
  nota_venta_id UUID,
  nota_venta_numero VARCHAR(50),
  cobrador_id UUID,
  cobrador_nombre VARCHAR(100),
  concepto VARCHAR(200),
  importe DECIMAL(15,2) DEFAULT 0,
  importe_no_conciliado DECIMAL(15,2) DEFAULT 0,
  moneda VARCHAR(10) DEFAULT 'ARS',
  tipo_cotizacion VARCHAR(50),
  cotizacion DECIMAL(15,4),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'publicado', 'cancelado')),
  fecha_publicacion TIMESTAMPTZ,
  fecha_cancelacion TIMESTAMPTZ,
  motivo_cancelacion TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Medios de pago del recibo
CREATE TABLE IF NOT EXISTS recibo_pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recibo_id UUID REFERENCES recibos(id) ON DELETE CASCADE,
  valor_id UUID REFERENCES caja_valores(id),
  valor_nombre VARCHAR(100),
  tipo_valor VARCHAR(30),
  importe_comprobante DECIMAL(15,2),
  moneda_comprobante VARCHAR(10),
  importe DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(10),
  es_tarjeta BOOLEAN DEFAULT false,
  tarjeta_nombre VARCHAR(50),
  cantidad_cuotas INTEGER DEFAULT 1,
  numero_cupon VARCHAR(50),
  recargo_porcentaje DECIMAL(8,4) DEFAULT 0,
  recargo_importe DECIMAL(15,2) DEFAULT 0,
  es_cheque BOOLEAN DEFAULT false,
  cheque_id UUID REFERENCES cheques_terceros(id),
  cupon_tarjeta_id UUID REFERENCES cupones_tarjeta(id)
);

-- Imputación de comprobantes
CREATE TABLE IF NOT EXISTS recibo_imputaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recibo_id UUID REFERENCES recibos(id) ON DELETE CASCADE,
  tipo_comprobante VARCHAR(30),
  comprobante_id UUID,
  comprobante_referencia VARCHAR(100),
  fecha_comprobante DATE,
  fecha_vencimiento DATE,
  saldo_moneda DECIMAL(15,2),
  moneda_comprobante VARCHAR(10),
  tipo_cotizacion VARCHAR(50),
  cotizacion_original DECIMAL(15,4),
  saldo_original DECIMAL(15,2),
  cotizacion_actual DECIMAL(15,4),
  saldo_actual DECIMAL(15,2),
  asignacion DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Secuencia para numeración
CREATE SEQUENCE IF NOT EXISTS recibos_seq START 34000;

-- Función para generar número de recibo
CREATE OR REPLACE FUNCTION generar_numero_recibo(p_sucursal VARCHAR)
RETURNS VARCHAR AS $$
DECLARE v_codigo VARCHAR(5); v_numero INTEGER;
BEGIN
  v_codigo := CASE p_sucursal
    WHEN 'Casa Central' THEN '20000'
    WHEN 'Puerto Norte' THEN '10000'
    WHEN 'Casilda'      THEN '30000'
    ELSE '00000' END;
  v_numero := nextval('recibos_seq');
  RETURN 'REC X ' || v_codigo || '-' || LPAD(v_numero::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;
