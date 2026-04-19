-- ============================================================================
-- 033_limpiar_asientos_te_prueba.sql
-- Limpia asientos de prueba del circuito TE con dirección contable incorrecta
-- ============================================================================

-- 1. Nullear FK en recepciones_toma y ajustes_clientes ANTES de borrar asientos
UPDATE recepciones_toma
SET asiento_id = NULL
WHERE asiento_id IN (
  SELECT id FROM contabilidad_asientos
  WHERE numero IN ('STK-26-00003', 'DV-26-00001', 'STK-26-00004')
);

UPDATE ajustes_clientes
SET asiento_id = NULL
WHERE asiento_id IN (
  SELECT id FROM contabilidad_asientos
  WHERE numero IN ('STK-26-00003', 'DV-26-00001', 'STK-26-00004')
);

-- 2. Eliminar líneas
DELETE FROM contabilidad_asientos_lineas
WHERE asiento_id IN (
  SELECT id FROM contabilidad_asientos
  WHERE numero IN ('STK-26-00003', 'DV-26-00001', 'STK-26-00004')
);

-- 3. Eliminar asientos
DELETE FROM contabilidad_asientos
WHERE numero IN ('STK-26-00003', 'DV-26-00001', 'STK-26-00004');

-- Verificación
SELECT numero, concepto, fecha FROM contabilidad_asientos
WHERE numero LIKE 'DV-26-%' OR numero LIKE 'STK-26-%'
ORDER BY numero;


