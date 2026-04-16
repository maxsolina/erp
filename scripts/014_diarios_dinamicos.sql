-- ============================================================================
-- 014_diarios_dinamicos.sql
-- Diarios dinámicos: uno por caja (efectivo + cheques) y uno por cuenta bancaria
-- Cell Home ERP
-- IDEMPOTENTE: ON CONFLICT, IF NOT EXISTS, WHERE NOT EXISTS
-- Requisito: 012_create_contabilidad.sql, create-cajas.sql,
--            create-config-bancos.sql, create-operaciones-financieras.sql
-- ============================================================================

-- ── 1. NUEVOS CAMPOS EN contabilidad_diarios ─────────────────────────────────
-- cuenta_bancaria_id: vincula el diario a la cuenta bancaria (cuentas_bancarias)
-- es_automatico: true = generado por el sistema, false = creado manualmente
ALTER TABLE contabilidad_diarios
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id),
  ADD COLUMN IF NOT EXISTS es_automatico      BOOLEAN NOT NULL DEFAULT false;

-- ── 2. FUNCIONES DE TRIGGER ──────────────────────────────────────────────────

-- 2a. Al insertar una caja → crear diario de efectivo
CREATE OR REPLACE FUNCTION fn_crear_diario_para_caja()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_sucursal_id INTEGER;
  v_codigo      TEXT;
BEGIN
  SELECT id INTO v_sucursal_id
  FROM sucursales WHERE nombre = NEW.sucursal LIMIT 1;

  v_codigo := 'EFE-' || COALESCE(NULLIF(TRIM(NEW.codigo), ''), UPPER(LEFT(NEW.id::text, 6)));

  INSERT INTO contabilidad_diarios
         (nombre, codigo, tipo, moneda, sucursal_id, caja_id, es_automatico, activo)
  VALUES (
    NEW.nombre || COALESCE(' - ' || NEW.sucursal, ''),
    v_codigo,
    'efectivo', 'ARS',
    v_sucursal_id,
    NEW.id,
    true,
    COALESCE(NEW.activo, true)
  )
  ON CONFLICT (codigo) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2b. Al actualizar nombre o activo de una caja → sincronizar diario(s)
CREATE OR REPLACE FUNCTION fn_sync_diario_caja()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.nombre IS DISTINCT FROM NEW.nombre THEN
    UPDATE contabilidad_diarios
    SET nombre     = NEW.nombre || COALESCE(' - ' || NEW.sucursal, ''),
        updated_at = now()
    WHERE caja_id = NEW.id AND es_automatico = true AND tipo = 'efectivo';

    UPDATE contabilidad_diarios
    SET nombre     = 'Cheques de Terceros - ' || NEW.nombre,
        updated_at = now()
    WHERE caja_id = NEW.id AND es_automatico = true AND tipo = 'banco_cheques';
  END IF;

  IF OLD.activo IS DISTINCT FROM NEW.activo THEN
    UPDATE contabilidad_diarios
    SET activo     = NEW.activo,
        updated_at = now()
    WHERE caja_id = NEW.id AND es_automatico = true;
  END IF;

  RETURN NEW;
END;
$$;

-- 2c. Al insertar un caja_valor de tipo banco_cheques → crear diario de cheques de terceros
--     (un único diario por caja, aunque haya varios caja_valores de tipo banco_cheques)
CREATE OR REPLACE FUNCTION fn_crear_diario_para_caja_valor()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_caja        RECORD;
  v_sucursal_id INTEGER;
  v_codigo      TEXT;
BEGIN
  IF NEW.tipo = 'banco_cheques' THEN
    SELECT * INTO v_caja FROM cajas WHERE id = NEW.caja_id;

    -- Solo crear si no existe ya un diario de cheques automático para esta caja
    IF NOT EXISTS (
      SELECT 1 FROM contabilidad_diarios
      WHERE caja_id = v_caja.id AND tipo = 'banco_cheques' AND es_automatico = true
    ) THEN
      SELECT id INTO v_sucursal_id
      FROM sucursales WHERE nombre = v_caja.sucursal LIMIT 1;

      v_codigo := 'CHQ-' || COALESCE(NULLIF(TRIM(v_caja.codigo), ''), UPPER(LEFT(v_caja.id::text, 6)));

      INSERT INTO contabilidad_diarios
             (nombre, codigo, tipo, moneda, sucursal_id, caja_id, es_automatico, activo)
      VALUES (
        'Cheques de Terceros - ' || v_caja.nombre,
        v_codigo,
        'banco_cheques', 'ARS',
        v_sucursal_id,
        v_caja.id,
        true,
        COALESCE(v_caja.activo, true)
      )
      ON CONFLICT (codigo) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2d. Al insertar una cuenta bancaria → crear diario tipo banco_cheques
CREATE OR REPLACE FUNCTION fn_crear_diario_para_cuenta_bancaria()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_codigo TEXT;
BEGIN
  v_codigo := 'BCO-' || UPPER(
    LEFT(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(NEW.numero_cuenta), ''), NEW.id::text), '[^A-Za-z0-9]', '', 'g'), 10)
  );

  INSERT INTO contabilidad_diarios
         (nombre, codigo, tipo, moneda, cuenta_bancaria_id, es_automatico, activo)
  VALUES (
    NEW.banco_nombre,
    v_codigo,
    'banco_cheques',
    COALESCE(NEW.moneda, 'ARS'),
    NEW.id,
    true,
    COALESCE(NEW.activo, true)
  )
  ON CONFLICT (codigo) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2e. Al actualizar banco_nombre o activo de cuenta bancaria → sincronizar diario
CREATE OR REPLACE FUNCTION fn_sync_diario_cuenta_bancaria()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.banco_nombre IS DISTINCT FROM NEW.banco_nombre THEN
    UPDATE contabilidad_diarios
    SET nombre     = NEW.banco_nombre,
        updated_at = now()
    WHERE cuenta_bancaria_id = NEW.id AND es_automatico = true;
  END IF;

  IF OLD.activo IS DISTINCT FROM NEW.activo THEN
    UPDATE contabilidad_diarios
    SET activo     = NEW.activo,
        updated_at = now()
    WHERE cuenta_bancaria_id = NEW.id AND es_automatico = true;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. CREAR TRIGGERS (solo si no existen) ────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crear_diario_caja') THEN
    CREATE TRIGGER trg_crear_diario_caja
    AFTER INSERT ON cajas
    FOR EACH ROW EXECUTE FUNCTION fn_crear_diario_para_caja();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_diario_caja') THEN
    CREATE TRIGGER trg_sync_diario_caja
    AFTER UPDATE OF nombre, activo ON cajas
    FOR EACH ROW EXECUTE FUNCTION fn_sync_diario_caja();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crear_diario_caja_valor') THEN
    CREATE TRIGGER trg_crear_diario_caja_valor
    AFTER INSERT ON caja_valores
    FOR EACH ROW EXECUTE FUNCTION fn_crear_diario_para_caja_valor();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crear_diario_cuenta_bancaria') THEN
    CREATE TRIGGER trg_crear_diario_cuenta_bancaria
    AFTER INSERT ON cuentas_bancarias
    FOR EACH ROW EXECUTE FUNCTION fn_crear_diario_para_cuenta_bancaria();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_diario_cuenta_bancaria') THEN
    CREATE TRIGGER trg_sync_diario_cuenta_bancaria
    AFTER UPDATE OF banco_nombre, activo ON cuentas_bancarias
    FOR EACH ROW EXECUTE FUNCTION fn_sync_diario_cuenta_bancaria();
  END IF;
END $$;

-- ── 4. BACKFILL: diarios de EFECTIVO para cajas ya existentes ────────────────
INSERT INTO contabilidad_diarios
       (nombre, codigo, tipo, moneda, sucursal_id, caja_id, es_automatico, activo)
SELECT
  c.nombre || COALESCE(' - ' || c.sucursal, ''),
  'EFE-' || COALESCE(NULLIF(TRIM(c.codigo), ''), UPPER(LEFT(c.id::text, 6))),
  'efectivo',
  'ARS',
  s.id,
  c.id,
  true,
  c.activo
FROM cajas c
LEFT JOIN sucursales s ON s.nombre = c.sucursal
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_diarios d
  WHERE d.caja_id = c.id AND d.tipo = 'efectivo' AND d.es_automatico = true
)
ON CONFLICT (codigo) DO NOTHING;

-- ── 5. BACKFILL: diarios de CHEQUES DE TERCEROS para cajas que los tienen ────
INSERT INTO contabilidad_diarios
       (nombre, codigo, tipo, moneda, sucursal_id, caja_id, es_automatico, activo)
SELECT DISTINCT ON (c.id)
  'Cheques de Terceros - ' || c.nombre,
  'CHQ-' || COALESCE(NULLIF(TRIM(c.codigo), ''), UPPER(LEFT(c.id::text, 6))),
  'banco_cheques',
  'ARS',
  s.id,
  c.id,
  true,
  c.activo
FROM cajas c
INNER JOIN caja_valores cv ON cv.caja_id = c.id AND cv.tipo = 'banco_cheques'
LEFT JOIN sucursales s ON s.nombre = c.sucursal
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_diarios d
  WHERE d.caja_id = c.id AND d.tipo = 'banco_cheques' AND d.es_automatico = true
)
ON CONFLICT (codigo) DO NOTHING;

-- ── 6. BACKFILL: diarios para CUENTAS BANCARIAS ya existentes ────────────────
INSERT INTO contabilidad_diarios
       (nombre, codigo, tipo, moneda, cuenta_bancaria_id, es_automatico, activo)
SELECT
  cb.banco_nombre,
  'BCO-' || UPPER(
    LEFT(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(cb.numero_cuenta), ''), cb.id::text), '[^A-Za-z0-9]', '', 'g'), 10)
  ),
  'banco_cheques',
  COALESCE(cb.moneda, 'ARS'),
  cb.id,
  true,
  cb.activo
FROM cuentas_bancarias cb
WHERE NOT EXISTS (
  SELECT 1 FROM contabilidad_diarios d
  WHERE d.cuenta_bancaria_id = cb.id
)
ON CONFLICT (codigo) DO NOTHING;

-- ── 7. ÍNDICES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_diarios_caja_id            ON contabilidad_diarios(caja_id);
CREATE INDEX IF NOT EXISTS idx_diarios_cuenta_bancaria_id ON contabilidad_diarios(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_diarios_es_automatico      ON contabilidad_diarios(es_automatico);

-- ── Verificación (ejecutar para confirmar) ────────────────────────────────────
-- SELECT tipo, es_automatico, COUNT(*) FROM contabilidad_diarios
-- GROUP BY tipo, es_automatico ORDER BY es_automatico, tipo;
--
-- SELECT d.codigo, d.nombre, d.tipo, d.moneda, d.es_automatico,
--        c.nombre AS caja_nombre, cb.banco_nombre
-- FROM contabilidad_diarios d
-- LEFT JOIN cajas c ON c.id = d.caja_id
-- LEFT JOIN cuentas_bancarias cb ON cb.id = d.cuenta_bancaria_id
-- ORDER BY d.es_automatico DESC, d.tipo, d.nombre;
