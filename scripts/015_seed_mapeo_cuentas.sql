-- ============================================================================
-- 015_seed_mapeo_cuentas.sql
-- Año fiscal 2026, períodos mensuales y mapeo contable para facturas de venta
-- Cell Home ERP
-- Requiere: 012_create_contabilidad.sql, 013_seed_plan_cuentas.sql ejecutados
-- IDEMPOTENTE: ON CONFLICT DO NOTHING, WHERE NOT EXISTS
-- ============================================================================

-- ── 1. AÑO FISCAL 2026 ───────────────────────────────────────────────────────
INSERT INTO contabilidad_anos_fiscales (nombre, codigo, fecha_inicio, fecha_fin, estado)
VALUES ('2026', 'EF-2026', '2026-01-01', '2026-12-31', 'aprobado')
ON CONFLICT (codigo) DO NOTHING;

-- ── 2. PERÍODOS MENSUALES 2026 ────────────────────────────────────────────────
DO $$
DECLARE
  v_ano_id UUID;
  v_mes    INTEGER;
  v_inicio DATE;
  v_fin    DATE;
BEGIN
  SELECT id INTO v_ano_id FROM contabilidad_anos_fiscales WHERE codigo = 'EF-2026';

  FOR v_mes IN 1..12 LOOP
    v_inicio := make_date(2026, v_mes, 1);
    v_fin    := (v_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    INSERT INTO contabilidad_periodos (ano_fiscal_id, nombre, fecha_inicio, fecha_fin, estado)
    VALUES (v_ano_id, TO_CHAR(v_inicio, 'MM/YYYY'), v_inicio, v_fin, 'aprobado')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── 3. MAPEO: FACTURA DE VENTA ────────────────────────────────────────────────
-- subtipo 'deudores'   → cuenta_debe  = Deudores por Ventas   (11030101)
-- subtipo 'ventas'     → cuenta_haber = Ventas Mercadería      (41010101)
-- subtipo 'iva_debito' → cuenta_haber = I.V.A. Débito Fiscal   (21010301)

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'factura_venta',
  'deudores',
  'Deudores por Ventas (Debe)',
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11030101' LIMIT 1),
  NULL,
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'VTA'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_venta' AND subtipo = 'deudores'
);

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'factura_venta',
  'ventas',
  'Ventas Mercadería (Haber)',
  NULL,
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '41010101' LIMIT 1),
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'VTA'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_venta' AND subtipo = 'ventas'
);

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'factura_venta',
  'iva_debito',
  'I.V.A. Débito Fiscal (Haber)',
  NULL,
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '21010301' LIMIT 1),
  (SELECT id FROM contabilidad_diarios       WHERE codigo = 'VTA'      LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_venta' AND subtipo = 'iva_debito'
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
