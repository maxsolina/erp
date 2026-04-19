-- ============================================================================
-- 037_seed_mapeo_remito_venta.sql
-- Mapeo contable para asiento CMV de remito de venta:
--
--   DEBE    42010101  CMV Productos Terminados    [costo total]
--   HABER   11050101  Productos Terminados        [costo total]
--
-- Diario: STK (Stock ARS)
-- IDEMPOTENTE: WHERE NOT EXISTS
-- Requiere: 012_create_contabilidad.sql, 013_seed_plan_cuentas.sql ejecutados
-- ============================================================================

-- subtipo 'cmv' → cuenta_debe = CMV Productos Terminados (42010101)
INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'remito_venta',
  'cmv',
  'CMV Productos Terminados (Debe)',
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '42010101' LIMIT 1),
  NULL,
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'STK'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'remito_venta' AND subtipo = 'cmv'
);

-- subtipo 'existencias' → cuenta_haber = Productos Terminados (11050101)
INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'remito_venta',
  'existencias',
  'Productos Terminados (Haber)',
  NULL,
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11050101' LIMIT 1),
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'STK'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'remito_venta' AND subtipo = 'existencias'
);
