-- ============================================================================
-- 032_circuito_toma_equipo_contable.sql
-- Cuenta puente 99999996, campos asiento_id y mapeo contable para TE
-- Cell Home ERP
-- IDEMPOTENTE
-- ============================================================================

-- ── 1. CUENTA PUENTE TOMA DE EQUIPOS ─────────────────────────────────────────
INSERT INTO contabilidad_plan_cuentas
  (codigo, nombre, tipo_interno, tipo_cuenta_id, permite_conciliacion, es_cuenta_puente, activo)
SELECT
  '99999996',
  'Cuenta Puente Toma de Equipos',
  'regular',
  (SELECT id FROM contabilidad_tipos_cuenta WHERE codigo = 'puente' LIMIT 1),
  false,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_plan_cuentas WHERE codigo = '99999996'
);

-- ── 2. COLUMNA asiento_id EN ajustes_clientes ─────────────────────────────────
ALTER TABLE ajustes_clientes
  ADD COLUMN IF NOT EXISTS asiento_id UUID REFERENCES contabilidad_asientos(id);

-- ── 3. COLUMNA asiento_id EN recepciones_toma ─────────────────────────────────
ALTER TABLE recepciones_toma
  ADD COLUMN IF NOT EXISTS asiento_id UUID REFERENCES contabilidad_asientos(id);

-- ── 4. COLUMNA es_automatica EN ajustes_clientes ──────────────────────────────
ALTER TABLE ajustes_clientes
  ADD COLUMN IF NOT EXISTS es_automatica BOOLEAN NOT NULL DEFAULT false;

-- ── 5. MARCAR AJUSTES EXISTENTES VINCULADOS A TE COMO AUTOMATICOS ────────────
UPDATE ajustes_clientes
SET es_automatica = true
WHERE toma_equipo_id IS NOT NULL AND es_automatica = false;

-- ── 6. MAPEO CONTABLE: NC TOMA DE EQUIPO ─────────────────────────────────────
-- subtipo 'deudores'     → cuenta_debe  = Deudores por Ventas  (11030101)
-- subtipo 'cta_puente'   → cuenta_haber = Cta Puente TE        (99999996)
-- Diario: DV (Devoluciones Ventas)

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'nc_toma_equipo',
  'deudores',
  'Deudores por Ventas — Debe (NC TE)',
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11030101' LIMIT 1),
  NULL,
  (SELECT id FROM contabilidad_diarios WHERE codigo = 'DV' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'nc_toma_equipo' AND subtipo = 'deudores'
);

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'nc_toma_equipo',
  'cta_puente',
  'Cuenta Puente TE — Haber (NC TE)',
  NULL,
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '99999996' LIMIT 1),
  (SELECT id FROM contabilidad_diarios WHERE codigo = 'DV' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'nc_toma_equipo' AND subtipo = 'cta_puente'
);

-- ── 7. MAPEO CONTABLE: RECEPCIÓN TOMA DE EQUIPO ───────────────────────────────
-- subtipo 'productos'    → cuenta_debe  = Productos Terminados (11050101)
-- subtipo 'cta_puente'   → cuenta_haber = Cta Puente TE        (99999996)
-- Diario: STK (Stock)

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'recepcion_toma_equipo',
  'productos',
  'Productos Terminados — Debe (Recepción TE)',
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11050101' LIMIT 1),
  NULL,
  (SELECT id FROM contabilidad_diarios WHERE codigo = 'STK' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'recepcion_toma_equipo' AND subtipo = 'productos'
);

INSERT INTO contabilidad_mapeo_cuentas
  (tipo_origen, subtipo, nombre, cuenta_debe_id, cuenta_haber_id, diario_id, activo)
SELECT
  'recepcion_toma_equipo',
  'cta_puente',
  'Cuenta Puente TE — Haber (Recepción TE)',
  NULL,
  (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '99999996' LIMIT 1),
  (SELECT id FROM contabilidad_diarios WHERE codigo = 'STK' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'recepcion_toma_equipo' AND subtipo = 'cta_puente'
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
LEFT JOIN contabilidad_diarios d ON d.id = m.diario_id
WHERE m.tipo_origen IN ('nc_toma_equipo', 'recepcion_toma_equipo');


