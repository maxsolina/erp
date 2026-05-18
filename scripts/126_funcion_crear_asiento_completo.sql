-- ============================================================
-- 126 · Función PL/pgSQL para crear asiento + líneas en un round-trip
--
-- Hoy desde Node hacemos 3 queries secuenciales para generar un asiento:
--   1) RPC contabilidad_generar_numero_asiento  → 1 round-trip
--   2) INSERT contabilidad_asientos             → 1 round-trip
--   3) INSERT contabilidad_asientos_lineas      → 1 round-trip
--
-- Cada round-trip a un Postgres remoto cuesta ~100-150ms en latencia de red.
-- Esta función mete los 3 pasos en una sola transacción dentro de Postgres,
-- así desde Node es 1 sola llamada RPC → 1 round-trip total.
--
-- Ahorro estimado: ~240ms por asiento generado. Como el cuello de botella
-- del flujo de confirmación es la generación del asiento, esto baja la
-- latencia total ~25% adicional sobre las optimizaciones de paralelismo.
--
-- Atómica: si el INSERT de líneas falla, la función levanta excepción y el
-- INSERT del asiento se revierte automáticamente (función = transacción).
-- ============================================================

CREATE OR REPLACE FUNCTION contabilidad_crear_asiento_completo(
  p_diario_id           UUID,
  p_periodo_id          UUID,
  p_fecha               DATE,
  p_sucursal_id         INTEGER,
  p_concepto            TEXT,
  p_referencia          TEXT,
  p_comprobante_tipo    TEXT,
  p_comprobante_id      UUID,
  p_moneda_original     TEXT,
  p_cotizacion_aplicada DECIMAL,
  p_tipo_cotizacion     TEXT,
  p_es_manual           BOOLEAN,
  p_estado              TEXT,
  p_lineas              JSONB  -- array de {cuenta_id, cuenta_codigo, cuenta_nombre, debe, haber, descripcion, orden, importe_moneda_original?}
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_numero      TEXT;
  v_asiento_id  UUID;
BEGIN
  -- 1. Generar número correlativo del diario
  SELECT contabilidad_generar_numero_asiento(p_diario_id, p_fecha) INTO v_numero;

  -- 2. Insertar cabecera del asiento
  INSERT INTO contabilidad_asientos (
    numero, diario_id, periodo_id, fecha, sucursal_id,
    concepto, referencia, comprobante_tipo, comprobante_id,
    moneda_original, cotizacion_aplicada, tipo_cotizacion,
    es_manual, estado
  ) VALUES (
    v_numero, p_diario_id, p_periodo_id, p_fecha, p_sucursal_id,
    p_concepto, p_referencia, p_comprobante_tipo, p_comprobante_id,
    COALESCE(p_moneda_original, 'ARS'), p_cotizacion_aplicada, p_tipo_cotizacion,
    COALESCE(p_es_manual, false), COALESCE(p_estado, 'publicado')
  )
  RETURNING id INTO v_asiento_id;

  -- 3. Insertar líneas en bloque (parseando el JSONB)
  INSERT INTO contabilidad_asientos_lineas (
    asiento_id, cuenta_id, cuenta_codigo, cuenta_nombre,
    debe, haber, descripcion, orden, importe_moneda_original
  )
  SELECT
    v_asiento_id,
    (l->>'cuenta_id')::UUID,
    l->>'cuenta_codigo',
    l->>'cuenta_nombre',
    COALESCE((l->>'debe')::DECIMAL,  0),
    COALESCE((l->>'haber')::DECIMAL, 0),
    l->>'descripcion',
    COALESCE((l->>'orden')::INTEGER, 0),
    NULLIF(l->>'importe_moneda_original', '')::DECIMAL
  FROM jsonb_array_elements(p_lineas) AS l;

  RETURN v_asiento_id;
END;
$$;

-- Permisos: que la pueda llamar el rol service_role (igual que las otras RPC)
GRANT EXECUTE ON FUNCTION contabilidad_crear_asiento_completo(
  UUID, UUID, DATE, INTEGER, TEXT, TEXT, TEXT, UUID, TEXT, DECIMAL, TEXT, BOOLEAN, TEXT, JSONB
) TO service_role, authenticated;

COMMENT ON FUNCTION contabilidad_crear_asiento_completo IS
'Crea un asiento contable completo (header + líneas) en una sola llamada y dentro
 de una sola transacción. Reemplaza la secuencia [RPC numero → INSERT asiento →
 INSERT líneas] que costaba 3 round-trips. Devuelve el UUID del asiento creado.';
