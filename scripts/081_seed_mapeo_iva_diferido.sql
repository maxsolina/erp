-- ============================================================================
-- 081_seed_mapeo_iva_diferido.sql
-- Mapeo contable para el ASIENTO 2 de facturas de venta:
-- IVA diferido + recargo de tarjeta cobrado al cliente.
--
-- Modelo: la factura nace "en negro" (asiento 1: DEBE Deudores / HABER Ventas).
-- Al confirmar con medios de pago facturable (tarjeta/transferencia) se genera
-- un segundo asiento que registra SOLO lo extra que paga el cliente:
--
--   DEBE   11030101  Deudores                         (IVA + recargo)
--   HABER  21010301  IVA Débito Fiscal                (IVA proporcional)
--   HABER  41010106  Ventas Mercadería (Recargo TC)   (recargo tarjeta)
--
-- Requiere: 013_seed_plan_cuentas.sql, 015_seed_mapeo_cuentas.sql ejecutados
-- IDEMPOTENTE: WHERE NOT EXISTS
-- ============================================================================

-- subtipo 'iva_diferido' → cuenta_haber = I.V.A. Débito Fiscal (21010301)
INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'factura_venta',
  'iva_diferido',
  'I.V.A. Débito Fiscal diferido (Haber)',
  NULL,
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '21010301' LIMIT 1),
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'VTA'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_venta' AND subtipo = 'iva_diferido'
);

-- subtipo 'recargo_tc' → cuenta_haber = Ventas Mercadería (Recargo TC) (41010106)
INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'factura_venta',
  'recargo_tc',
  'Ventas Mercadería - Recargo TC (Haber)',
  NULL,
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '41010106' LIMIT 1),
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'VTA'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_venta' AND subtipo = 'recargo_tc'
);

-- ── Verificación ──────────────────────────────────────────────────────────────
SELECT
  m.tipo_origen,
  m.subtipo,
  m.nombre,
  cd.codigo AS cuenta_debe,
  ch.codigo AS cuenta_haber,
  d.codigo  AS diario
FROM contabilidad_mapeo_cuentas m
LEFT JOIN contabilidad_plan_cuentas cd ON cd.id = m.cuenta_debe_id
LEFT JOIN contabilidad_plan_cuentas ch ON ch.id = m.cuenta_haber_id
LEFT JOIN contabilidad_diarios      d  ON d.id  = m.diario_id
WHERE m.tipo_origen = 'factura_venta'
ORDER BY m.subtipo;
