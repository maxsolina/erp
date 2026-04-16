-- ============================================================================
-- 022_seed_mapeo_facturas_compra.sql
-- Mapeo contable para facturas de compra (espejo de factura_venta).
-- Requiere: 012_create_contabilidad.sql, 013_seed_plan_cuentas.sql,
--           014_diarios_dinamicos.sql ejecutados.
-- IDEMPOTENTE: WHERE NOT EXISTS
-- ============================================================================
-- subtipo 'acreedores'  → cuenta_haber = Proveedores        (21010101)
-- subtipo 'compras'     → cuenta_debe  = Compras Mercadería (51010101)
-- subtipo 'iva_credito' → cuenta_debe  = I.V.A. Crédito     (11030301)
-- ============================================================================

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'factura_compra',
  'acreedores',
  'Proveedores / Acreedores (Haber)',
  NULL,
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '21010101' LIMIT 1),
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'CMP'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_compra' AND subtipo = 'acreedores'
);

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'factura_compra',
  'compras',
  'Compras Mercadería (Debe)',
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '51010101' LIMIT 1),
  NULL,
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'CMP'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_compra' AND subtipo = 'compras'
);

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'factura_compra',
  'iva_credito',
  'I.V.A. Crédito Fiscal (Debe)',
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11030301' LIMIT 1),
  NULL,
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'CMP'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_compra' AND subtipo = 'iva_credito'
);
