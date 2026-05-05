-- ============================================================================
-- 097_ajustes_stock.sql
-- Tablas para Ajustes de Stock (positivos y negativos) + mapeo contable.
--
-- Flujo:
--   1. Usuario crea ajuste en estado 'borrador'
--   2. Solicita aprobación → 'pendiente'
--   3. Aprobador confirma → 'confirmado' (mueve stock + genera asiento)
--   4. En cualquier momento puede 'cancelado'
-- ============================================================================

-- ─── Cabecera de ajustes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ajustes_stock (
  id              SERIAL PRIMARY KEY,
  numero          TEXT NOT NULL UNIQUE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('positivo', 'negativo')),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  deposito_id     INTEGER REFERENCES depositos(id),
  deposito_nombre TEXT,
  ubicacion_id    INTEGER REFERENCES ubicaciones(id),
  ubicacion_nombre TEXT,
  sucursal_id     INTEGER REFERENCES sucursales(id),
  concepto        TEXT,
  observaciones   TEXT,
  estado          TEXT NOT NULL DEFAULT 'borrador'
                  CHECK (estado IN ('borrador', 'pendiente', 'confirmado', 'cancelado')),
  asiento_id      UUID REFERENCES contabilidad_asientos(id),
  solicitado_por  TEXT,
  solicitado_at   TIMESTAMPTZ,
  aprobado_por    TEXT,
  aprobado_at     TIMESTAMPTZ,
  cancelado_por   TEXT,
  cancelado_at    TIMESTAMPTZ,
  motivo_cancelacion TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_stock_tipo_estado ON ajustes_stock(tipo, estado);
CREATE INDEX IF NOT EXISTS idx_ajustes_stock_fecha ON ajustes_stock(fecha DESC);

-- ─── Líneas de ajustes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ajustes_stock_lineas (
  id              SERIAL PRIMARY KEY,
  ajuste_id       INTEGER NOT NULL REFERENCES ajustes_stock(id) ON DELETE CASCADE,
  producto_id     BIGINT REFERENCES productos(id),
  producto_nombre TEXT,
  producto_codigo TEXT,
  cantidad        NUMERIC NOT NULL DEFAULT 1,
  -- Para productos con número de serie:
  --   * Positivo: las series nuevas a CREAR (stock_unidades.id queda null hasta confirmar)
  --   * Negativo: la stock_unidad_id de la unidad existente a DAR DE BAJA
  stock_unidad_id INTEGER REFERENCES stock_unidades(id),
  nro_serie       TEXT,
  color           TEXT,
  bateria_pct     INTEGER,
  es_outlet       BOOLEAN DEFAULT FALSE,
  observaciones   TEXT,
  costo_unitario  NUMERIC, -- usado para valuar el asiento
  orden           INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ajustes_lineas_ajuste ON ajustes_stock_lineas(ajuste_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_lineas_producto ON ajustes_stock_lineas(producto_id);

-- ─── Secuencia para numerar ajustes ────────────────────────────────────────
-- Genera "AJP-00001" para positivos, "AJN-00001" para negativos.
CREATE OR REPLACE FUNCTION next_ajuste_stock_numero(p_tipo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  next_n INTEGER;
BEGIN
  IF p_tipo = 'positivo' THEN
    prefix := 'AJP-';
  ELSIF p_tipo = 'negativo' THEN
    prefix := 'AJN-';
  ELSE
    RAISE EXCEPTION 'Tipo inválido: %', p_tipo;
  END IF;

  SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(numero, '\D', '', 'g'), '')::INTEGER), 0) + 1
    INTO next_n
    FROM ajustes_stock
   WHERE numero LIKE prefix || '%';

  RETURN prefix || LPAD(next_n::TEXT, 5, '0');
END;
$$;

-- ─── Seed de mapeo contable ─────────────────────────────────────────────────
-- Usa cuentas que ya existen en este sistema:
--   11050102 Mercadería de Reventa  (existencias)
--   42010103 Ajuste de Inventario Positivo  (contra-cuenta para +)
--   42010104 Ajuste de Inventario Negativo  (contra-cuenta para -)
-- Diario: STK (Stock).
DO $$
DECLARE
  v_diario_stk UUID;
  v_cta_mercaderia UUID;
  v_cta_ajuste_pos UUID;
  v_cta_ajuste_neg UUID;
BEGIN
  SELECT id INTO v_diario_stk FROM contabilidad_diarios WHERE codigo = 'STK' LIMIT 1;
  SELECT id INTO v_cta_mercaderia FROM contabilidad_plan_cuentas WHERE codigo = '11050102' LIMIT 1;
  SELECT id INTO v_cta_ajuste_pos FROM contabilidad_plan_cuentas WHERE codigo = '42010103' LIMIT 1;
  SELECT id INTO v_cta_ajuste_neg FROM contabilidad_plan_cuentas WHERE codigo = '42010104' LIMIT 1;

  IF v_diario_stk IS NULL OR v_cta_mercaderia IS NULL OR v_cta_ajuste_pos IS NULL OR v_cta_ajuste_neg IS NULL THEN
    RAISE NOTICE 'Faltan cuentas/diario base — saltando seed de mapeo de ajustes';
    RETURN;
  END IF;

  -- Borrar mapeos previos del mismo tipo_origen para regenerar idempotentemente
  DELETE FROM contabilidad_mapeo_cuentas WHERE tipo_origen IN ('ajuste_positivo','ajuste_negativo');

  -- ajuste_positivo: DR Mercadería / CR Ajuste Inventario Positivo
  INSERT INTO contabilidad_mapeo_cuentas (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
  VALUES ('ajuste_positivo', 'existencias',   'Ajuste Positivo · Existencias (Mercadería)', v_cta_mercaderia, NULL,             v_diario_stk, TRUE),
         ('ajuste_positivo', 'contrapartida', 'Ajuste Positivo · Contrapartida',             NULL,             v_cta_ajuste_pos, v_diario_stk, TRUE);

  -- ajuste_negativo: DR Ajuste Inventario Negativo / CR Mercadería
  INSERT INTO contabilidad_mapeo_cuentas (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
  VALUES ('ajuste_negativo', 'contrapartida', 'Ajuste Negativo · Contrapartida',             v_cta_ajuste_neg, NULL,             v_diario_stk, TRUE),
         ('ajuste_negativo', 'existencias',   'Ajuste Negativo · Existencias (Mercadería)', NULL,             v_cta_mercaderia, v_diario_stk, TRUE);
END $$;
