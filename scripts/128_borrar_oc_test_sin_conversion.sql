-- ============================================================
-- 128 · Borrar las 4 OCs de prueba que se generaron sin cotización
--
-- Estamos en fase de creación del ERP, son datos de test.
-- Borro en orden FK-safe (dependientes primero, padre al final):
--   1. Líneas de asientos
--   2. Asientos (CMP-26-00026 a CMP-26-00029)
--   3. Líneas de facturas de compra
--   4. Recepciones (las que apuntan a esas facturas)
--   5. Facturas de compra (FC-0000006 a FC-0000009)
--   6. Eventos de seguimiento de esas OCs
--   7. Órdenes de compra (OC-00006 a OC-00009)
--
-- Todo dentro de una transacción — si algo falla, ROLLBACK automático.
-- ============================================================

BEGIN;

-- 1. Líneas de los asientos rotos
DELETE FROM contabilidad_asientos_lineas
WHERE asiento_id IN (
  SELECT id FROM contabilidad_asientos
  WHERE numero IN ('CMP-26-00026','CMP-26-00027','CMP-26-00028','CMP-26-00029')
);

-- 2. Asientos
DELETE FROM contabilidad_asientos
WHERE numero IN ('CMP-26-00026','CMP-26-00027','CMP-26-00028','CMP-26-00029');

-- 3. Líneas de facturas de compra
DELETE FROM compras_facturas_lineas
WHERE factura_id IN (
  SELECT id FROM facturas_compra
  WHERE numero IN ('FC-0000006','FC-0000007','FC-0000008','FC-0000009')
);

-- 4. Recepciones que apuntan a esas facturas
DELETE FROM recepciones
WHERE factura_id IN (
  SELECT id FROM facturas_compra
  WHERE numero IN ('FC-0000006','FC-0000007','FC-0000008','FC-0000009')
);

-- 5. Facturas de compra
DELETE FROM facturas_compra
WHERE numero IN ('FC-0000006','FC-0000007','FC-0000008','FC-0000009');

-- 6. Eventos de seguimiento de las OCs (audit trail)
DELETE FROM documentos_seguimiento
WHERE tipo_documento = 'orden_compra'
  AND documento_id IN (
    SELECT id FROM ordenes_compra
    WHERE numero IN ('OC-00006','OC-00007','OC-00008','OC-00009')
  );

-- 7. Órdenes de compra
DELETE FROM ordenes_compra
WHERE numero IN ('OC-00006','OC-00007','OC-00008','OC-00009');

-- ─── Verificación ────────────────────────────────────────────────────────────
-- Estos counts tienen que dar 0 todos antes del COMMIT:
SELECT 'ordenes_compra'   AS tabla, COUNT(*) AS quedan FROM ordenes_compra   WHERE numero IN ('OC-00006','OC-00007','OC-00008','OC-00009')
UNION ALL
SELECT 'facturas_compra',         COUNT(*) FROM facturas_compra              WHERE numero IN ('FC-0000006','FC-0000007','FC-0000008','FC-0000009')
UNION ALL
SELECT 'asientos',                COUNT(*) FROM contabilidad_asientos        WHERE numero IN ('CMP-26-00026','CMP-26-00027','CMP-26-00028','CMP-26-00029');

-- Si los 3 counts dan 0, hacer:
COMMIT;
-- Si NO dan 0 o algo se ve raro:
-- ROLLBACK;
