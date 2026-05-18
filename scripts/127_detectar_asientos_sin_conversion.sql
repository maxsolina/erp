-- ============================================================
-- 127 · Detectar asientos que se publicaron SIN conversión a ARS
--
-- Bug detectado: cuando se confirmaba una OC en USD/EUR sin completar el
-- campo "Cotización del Día", el factory de asientos hacía fallback silencioso
-- a cotización=1 y publicaba el asiento con debe/haber en moneda extranjera
-- en vez de pesos. Esto descuadra cualquier libro mayor en ARS.
--
-- Este script SOLO DETECTA. No modifica nada. Devuelve la lista de asientos
-- sospechosos para que decidas cómo arreglarlos (típicamente: anular con un
-- asiento de reversión, cargar la cotización correcta, y re-confirmar el
-- circuito o crear un asiento de ajuste manual).
-- ============================================================

-- ─── 1. Asientos donde moneda_original != ARS pero cotizacion_aplicada es NULL ───
-- Estos son los más peligrosos: la columna `cotizacion_aplicada` quedó vacía
-- porque el código metió `tc !== 1 ? tc : null`. Si tc=1 (fallback silencioso),
-- la cotización se grabó como NULL y los importes quedaron en moneda extranjera.
SELECT
  a.id,
  a.numero,
  a.fecha,
  a.referencia                        AS comprobante,
  a.comprobante_tipo,
  a.moneda_original,
  a.cotizacion_aplicada,
  a.concepto,
  (SELECT SUM(debe)  FROM contabilidad_asientos_lineas WHERE asiento_id = a.id) AS suma_debe,
  (SELECT SUM(haber) FROM contabilidad_asientos_lineas WHERE asiento_id = a.id) AS suma_haber
FROM contabilidad_asientos a
WHERE a.moneda_original IN ('USD', 'EUR')
  AND a.cotizacion_aplicada IS NULL
  AND a.estado = 'publicado'
ORDER BY a.fecha DESC, a.numero DESC;

-- ─── 2. Asientos del CIRCUITO de COMPRAS específicamente (los más probables) ───
-- Si querés filtrar solo los generados por confirmación de OC:
SELECT
  a.id,
  a.numero,
  a.fecha,
  a.referencia                        AS factura_compra_numero,
  a.moneda_original,
  a.cotizacion_aplicada,
  fc.proveedor_nombre,
  fc.orden_compra_id,
  oc.numero                           AS oc_numero,
  oc.cotizacion_dia                   AS oc_cotizacion_que_faltaba
FROM contabilidad_asientos a
LEFT JOIN facturas_compra fc          ON a.referencia = fc.numero
LEFT JOIN ordenes_compra  oc          ON oc.id = fc.orden_compra_id
WHERE a.comprobante_tipo = 'factura_compra'
  AND a.moneda_original IN ('USD', 'EUR')
  AND a.cotizacion_aplicada IS NULL
  AND a.estado = 'publicado'
ORDER BY a.fecha DESC;

-- ─── 3. Verificar si la OC original SÍ tenía cotización cargada ──────────────
-- Útil para saber si se puede recalcular con el dato existente o si hace falta
-- pedirle al usuario que cargue una cotización histórica.
SELECT
  oc.numero               AS oc_numero,
  oc.moneda,
  oc.cotizacion_dia,
  oc.fecha,
  oc.estado,
  fc.numero               AS factura_compra,
  fc.tipo_cambio          AS factura_tipo_cambio,
  a.numero                AS asiento_numero,
  a.cotizacion_aplicada   AS asiento_cotizacion
FROM ordenes_compra oc
LEFT JOIN facturas_compra      fc ON fc.orden_compra_id = oc.id
LEFT JOIN contabilidad_asientos a ON a.referencia = fc.numero AND a.comprobante_tipo = 'factura_compra'
WHERE oc.moneda IN ('USD', 'EUR')
  AND oc.estado = 'confirmada'
ORDER BY oc.fecha DESC;

-- ============================================================
-- CÓMO ARREGLARLO (después de revisar los resultados de arriba):
--
-- Opción A — si la OC tenía cotizacion_dia cargada y el asiento la perdió en
-- el camino (bug A): se puede UPDATE directo de cotizacion_aplicada y
-- MULTIPLICAR debe/haber por esa cotización. Hacer en una transacción manual.
--
-- Opción B — si la OC no tenía cotización (caso más común): hay que decidir
-- qué cotización histórica usar. Cargarla en la OC, anular el asiento viejo
-- con un asiento de reversa, y crear uno nuevo con los importes correctos.
--
-- En ambos casos, NO HAGAS DELETE de asientos publicados sin reversa — la
-- auditoría contable exige trazabilidad. Usá el patrón anulación + nuevo.
-- ============================================================
