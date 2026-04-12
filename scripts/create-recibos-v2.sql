-- ============================================================================
-- RECIBOS - Tablas hijas + secuencia + funcion
-- La tabla recibos ya debe existir. Este script detecta el tipo de recibos.id
-- y crea las tablas hijas con el tipo correcto (INTEGER o UUID).
-- Ejecutar completo en Supabase SQL Editor.
-- ============================================================================

DO $$
DECLARE
  v_id_type TEXT;
BEGIN
  -- Detectar tipo de recibos.id
  SELECT data_type INTO v_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'recibos' AND column_name = 'id';

  IF v_id_type IS NULL THEN
    RAISE EXCEPTION 'La tabla recibos no existe. Creala primero.';
  END IF;

  -- ---- recibo_pagos ----
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recibo_pagos') THEN
    EXECUTE format('
      CREATE TABLE recibo_pagos (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        recibo_id %s REFERENCES recibos(id) ON DELETE CASCADE,
        valor_id UUID,
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
        cheque_id UUID,
        cupon_tarjeta_id UUID
      )', v_id_type);
    RAISE NOTICE 'Tabla recibo_pagos creada con recibo_id tipo: %', v_id_type;
  ELSE
    RAISE NOTICE 'Tabla recibo_pagos ya existe, no se modifica.';
  END IF;

  -- ---- recibo_imputaciones ----
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='recibo_imputaciones') THEN
    EXECUTE format('
      CREATE TABLE recibo_imputaciones (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        recibo_id %s REFERENCES recibos(id) ON DELETE CASCADE,
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
      )', v_id_type);
    RAISE NOTICE 'Tabla recibo_imputaciones creada con recibo_id tipo: %', v_id_type;
  ELSE
    RAISE NOTICE 'Tabla recibo_imputaciones ya existe, no se modifica.';
  END IF;
END $$;

-- Secuencia para numeracion
CREATE SEQUENCE IF NOT EXISTS recibos_seq START 34000;

-- Funcion para generar numero de recibo
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
