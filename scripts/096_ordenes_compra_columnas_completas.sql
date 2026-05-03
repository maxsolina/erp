-- ============================================================================
-- 096_ordenes_compra_columnas_completas.sql
-- Agrega TODAS las columnas que el form de OC del App Router escribe pero
-- que pueden no existir en la DB (script 004 base muy mínimo + scripts
-- intermedios opcionales). IDEMPOTENTE — se puede correr varias veces.
-- ============================================================================

ALTER TABLE public.ordenes_compra
  -- Fechas
  ADD COLUMN IF NOT EXISTS fecha_entrega_estimada DATE,
  ADD COLUMN IF NOT EXISTS fecha_entrega_esperada DATE,

  -- Cotización (script 047 los agrega también — acá idempotente)
  ADD COLUMN IF NOT EXISTS tipo_cotizacion TEXT DEFAULT 'oficial',
  ADD COLUMN IF NOT EXISTS cotizacion_dia  NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS tipo_cambio     NUMERIC(15,4),

  -- Sucursal / depósito / ubicación destino
  ADD COLUMN IF NOT EXISTS sucursal             TEXT,
  ADD COLUMN IF NOT EXISTS sucursal_id          INTEGER,
  ADD COLUMN IF NOT EXISTS deposito_destino     TEXT,
  ADD COLUMN IF NOT EXISTS deposito_destino_id  INTEGER,
  ADD COLUMN IF NOT EXISTS ubicacion            TEXT,
  ADD COLUMN IF NOT EXISTS ubicacion_destino    TEXT,
  ADD COLUMN IF NOT EXISTS ubicacion_destino_id INTEGER,

  -- Líneas / totales adicionales
  ADD COLUMN IF NOT EXISTS lineas        JSONB,
  ADD COLUMN IF NOT EXISTS impuestos     NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observaciones TEXT,

  -- Pago / método
  ADD COLUMN IF NOT EXISTS termino_pago  TEXT,
  ADD COLUMN IF NOT EXISTS metodo_pago   TEXT,
  ADD COLUMN IF NOT EXISTS metodo_compra TEXT,
  ADD COLUMN IF NOT EXISTS tipo_compra   TEXT,

  -- Vínculos (taller, despacho, circuitos)
  ADD COLUMN IF NOT EXISTS legajo_id              INTEGER,
  ADD COLUMN IF NOT EXISTS despacho_simple_id     INTEGER,
  ADD COLUMN IF NOT EXISTS factura_circuito_id    INTEGER,
  ADD COLUMN IF NOT EXISTS recepcion_circuito_id  INTEGER,

  -- Cancelación
  ADD COLUMN IF NOT EXISTS cancelacion_motivo TEXT,
  ADD COLUMN IF NOT EXISTS cancelacion_fecha  TIMESTAMPTZ;

-- Verificación: muestra todas las columnas finales
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ordenes_compra'
ORDER BY ordinal_position;
