-- ============================================================================
-- Módulo Contabilidad — Schema completo
-- Cell Home ERP · Versión 1.0
-- Prerequisito: sucursales, cajas, caja_valores, cuentas_bancarias,
--               clientes, facturas, recibos, ordenes_pago
-- ============================================================================

-- ─── 1. TIPOS DE CUENTA ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_tipos_cuenta (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT    NOT NULL,
  codigo      TEXT    NOT NULL UNIQUE,
  es_resultado             BOOLEAN DEFAULT false,
  categoria_balance_pyg    TEXT,
  metodo_diferimiento      TEXT    DEFAULT 'ninguno'
    CHECK (metodo_diferimiento IN ('ninguno','mensual','anual')),
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO contabilidad_tipos_cuenta (nombre, codigo, es_resultado, categoria_balance_pyg) VALUES
  ('A Cobrar',               'a_cobrar',          false, 'Activo Corriente'),
  ('A Pagar',                'a_pagar',            false, 'Pasivo Corriente'),
  ('Activo',                 'activo',             false, 'Activo'),
  ('Banco',                  'banco',              false, 'Activo Corriente'),
  ('Efectivo',               'efectivo',           false, 'Activo Corriente'),
  ('Egresos',                'egresos',            true,  'Egresos'),
  ('Ingresos',               'ingresos',           true,  'Ingresos'),
  ('Pasivo',                 'pasivo',             false, 'Pasivo'),
  ('Patrimonio Neto',        'patrimonio_neto',    false, 'Patrimonio Neto'),
  ('Raíz/Vista',             'raiz',               false, NULL),
  ('Vista de Activo',        'vista_activo',       false, 'Activo'),
  ('Vista de Egresos',       'vista_egresos',      true,  'Egresos'),
  ('Vista de Ingresos',      'vista_ingresos',     true,  'Ingresos'),
  ('Vista de Pasivo',        'vista_pasivo',       false, 'Pasivo'),
  ('Vista de Patrimonio Neto','vista_patrimonio',  false, 'Patrimonio Neto')
ON CONFLICT (codigo) DO NOTHING;

-- ─── 2. PLAN DE CUENTAS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_plan_cuentas (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo          TEXT    NOT NULL UNIQUE,
  nombre          TEXT    NOT NULL,
  cuenta_padre_id UUID    REFERENCES contabilidad_plan_cuentas(id),
  tipo_interno    TEXT    DEFAULT 'regular'
    CHECK (tipo_interno IN ('regular','liquidez','a_cobrar','a_pagar')),
  tipo_cuenta_id  UUID    REFERENCES contabilidad_tipos_cuenta(id),
  permite_movimientos_analiticos   BOOLEAN DEFAULT false,
  impuestos_predeterminados        JSONB   DEFAULT '[]',
  permite_conciliacion             BOOLEAN DEFAULT false,
  es_cuenta_puente                 BOOLEAN DEFAULT false,
  moneda_secundaria                TEXT    CHECK (moneda_secundaria IN ('ARS','USD','EUR')),
  activo          BOOLEAN DEFAULT true,
  -- Flags de disponibilidad
  disponible_registro_banco              BOOLEAN DEFAULT false,
  disponible_registro_caja               BOOLEAN DEFAULT false,
  disponible_ajuste_cheque_rechazado     BOOLEAN DEFAULT false,
  disponible_rendicion_gastos            BOOLEAN DEFAULT false,
  disponible_rendicion_fondos_fijos      BOOLEAN DEFAULT false,
  es_cuenta_ventas                       BOOLEAN DEFAULT false,
  es_cuenta_compras                      BOOLEAN DEFAULT false,
  es_cuenta_resultado_tenencia_positivo  BOOLEAN DEFAULT false,
  es_cuenta_resultado_tenencia_negativo  BOOLEAN DEFAULT false,
  es_cuenta_impuestos                    BOOLEAN DEFAULT false,
  es_cuenta_existencias                  BOOLEAN DEFAULT false,
  es_cuenta_mercaderia_transito          BOOLEAN DEFAULT false,
  es_cuenta_mercaderia_produccion        BOOLEAN DEFAULT false,
  es_cuenta_cmv                          BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_cuentas_padre ON contabilidad_plan_cuentas(cuenta_padre_id);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_tipo  ON contabilidad_plan_cuentas(tipo_cuenta_id);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_activo ON contabilidad_plan_cuentas(activo);

-- ─── 3. AÑOS FISCALES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_anos_fiscales (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre       TEXT    NOT NULL,
  codigo       TEXT    NOT NULL UNIQUE,
  fecha_inicio DATE    NOT NULL,
  fecha_fin    DATE    NOT NULL,
  estado       TEXT    DEFAULT 'aprobado'
    CHECK (estado IN ('aprobado','cerrado')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. PERÍODOS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_periodos (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  ano_fiscal_id  UUID    NOT NULL REFERENCES contabilidad_anos_fiscales(id) ON DELETE CASCADE,
  nombre         TEXT    NOT NULL,                -- ej: "04/2026"
  fecha_inicio   DATE    NOT NULL,
  fecha_fin      DATE    NOT NULL,
  estado         TEXT    DEFAULT 'aprobado'
    CHECK (estado IN ('aprobado','para_cerrar','cerrado')),
  volcado        BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_periodos_ano ON contabilidad_periodos(ano_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_periodos_fechas ON contabilidad_periodos(fecha_inicio, fecha_fin);

-- ─── 5. DIARIOS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_diarios (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      TEXT    NOT NULL,
  codigo      TEXT    NOT NULL UNIQUE,
  tipo        TEXT    NOT NULL
    CHECK (tipo IN ('venta','devolucion_venta','compra','devolucion_compra',
                    'efectivo','banco_cheques','general','libro_diario','stock')),
  proveedor_id                    UUID,
  diario_analitico_id             UUID REFERENCES contabilidad_diarios(id),
  cuenta_debito_predeterminada_id UUID REFERENCES contabilidad_plan_cuentas(id),
  cuenta_haber_predeterminada_id  UUID REFERENCES contabilidad_plan_cuentas(id),
  cuenta_puente_conciliacion_id   UUID REFERENCES contabilidad_plan_cuentas(id),
  moneda      TEXT    DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD','EUR')),
  secuencia   INTEGER DEFAULT 1,
  sucursal_id INTEGER REFERENCES sucursales(id),
  caja_id     UUID    REFERENCES cajas(id),
  filtrar_por_sucursal      BOOLEAN DEFAULT false,
  filtrar_por_subcompania   BOOLEAN DEFAULT false,
  permitir_cancelacion_asientos BOOLEAN DEFAULT true,
  agrupar_lineas_factura    BOOLEAN DEFAULT false,
  numero_cuenta_requerido   BOOLEAN DEFAULT false,
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Usuarios habilitados por diario
CREATE TABLE IF NOT EXISTS contabilidad_diarios_usuarios (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  diario_id  UUID NOT NULL REFERENCES contabilidad_diarios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  usuario_nombre TEXT,
  rol        TEXT DEFAULT 'cobrador' CHECK (rol IN ('cobrador','vendedor','partner')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Secuencias de numeración por diario+año
CREATE TABLE IF NOT EXISTS contabilidad_diarios_secuencias (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  diario_id  UUID    NOT NULL REFERENCES contabilidad_diarios(id) ON DELETE CASCADE,
  anio       INTEGER NOT NULL,
  ultimo_numero INTEGER DEFAULT 0,
  UNIQUE (diario_id, anio)
);

-- Diarios por defecto
INSERT INTO contabilidad_diarios (nombre, codigo, tipo, moneda) VALUES
  ('Ventas (ARS)',              'VTA',  'venta',            'ARS'),
  ('Devoluciones Ventas (ARS)', 'DV',   'devolucion_venta', 'ARS'),
  ('Compras (ARS)',             'CMP',  'compra',           'ARS'),
  ('Devoluciones Compras (ARS)','DC',   'devolucion_compra','ARS'),
  ('Libro Diario (ARS)',        'LD',   'libro_diario',     'ARS'),
  ('General (ARS)',             'GEN',  'general',          'ARS'),
  ('Stock (ARS)',               'STK',  'stock',            'ARS')
ON CONFLICT (codigo) DO NOTHING;

-- ─── 6. ASIENTOS CONTABLES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_asientos (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  numero              TEXT    UNIQUE,                         -- generado al publicar
  diario_id           UUID    NOT NULL REFERENCES contabilidad_diarios(id),
  periodo_id          UUID    REFERENCES contabilidad_periodos(id),
  fecha               DATE    NOT NULL DEFAULT CURRENT_DATE,
  partner_id          UUID,
  partner_tipo        TEXT    CHECK (partner_tipo IN ('cliente','proveedor')),
  referencia          TEXT,
  comprobante_tipo    TEXT,                                   -- 'factura','recibo','orden_pago', etc.
  comprobante_id      UUID,
  nota_venta_id       UUID,
  sucursal_id         INTEGER REFERENCES sucursales(id),
  concepto            TEXT,
  a_revisar           BOOLEAN DEFAULT false,
  estado              TEXT    NOT NULL DEFAULT 'no_asentado'
    CHECK (estado IN ('no_asentado','publicado','cancelado')),
  es_apertura         BOOLEAN DEFAULT false,
  es_cierre           BOOLEAN DEFAULT false,
  es_manual           BOOLEAN DEFAULT false,
  moneda_original     TEXT    DEFAULT 'ARS' CHECK (moneda_original IN ('ARS','USD','EUR')),
  cotizacion_aplicada DECIMAL(18,6),
  tipo_cotizacion     TEXT,
  tiene_diferencia_cambio BOOLEAN DEFAULT false,
  asiento_reversion_id UUID REFERENCES contabilidad_asientos(id),
  created_by          UUID,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asientos_diario   ON contabilidad_asientos(diario_id);
CREATE INDEX IF NOT EXISTS idx_asientos_periodo  ON contabilidad_asientos(periodo_id);
CREATE INDEX IF NOT EXISTS idx_asientos_estado   ON contabilidad_asientos(estado);
CREATE INDEX IF NOT EXISTS idx_asientos_fecha    ON contabilidad_asientos(fecha);
CREATE INDEX IF NOT EXISTS idx_asientos_comprobante ON contabilidad_asientos(comprobante_tipo, comprobante_id);
CREATE INDEX IF NOT EXISTS idx_asientos_sucursal ON contabilidad_asientos(sucursal_id);

-- ─── 7. LÍNEAS DE ASIENTOS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_asientos_lineas (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  asiento_id            UUID    NOT NULL REFERENCES contabilidad_asientos(id) ON DELETE CASCADE,
  cuenta_id             UUID    NOT NULL REFERENCES contabilidad_plan_cuentas(id),
  cuenta_codigo         TEXT    NOT NULL,
  cuenta_nombre         TEXT    NOT NULL,
  cuenta_analitica_id   UUID,
  debe                  DECIMAL(18,2) DEFAULT 0,
  haber                 DECIMAL(18,2) DEFAULT 0,
  descripcion           TEXT,
  importe_moneda_original DECIMAL(18,6),
  fecha_vencimiento     DATE,
  orden                 INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asientos_lineas_asiento  ON contabilidad_asientos_lineas(asiento_id);
CREATE INDEX IF NOT EXISTS idx_asientos_lineas_cuenta   ON contabilidad_asientos_lineas(cuenta_id);

-- ─── 8. MAPEO COMPROBANTE → CUENTAS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_mapeo_cuentas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_origen     TEXT NOT NULL,  -- 'factura_venta','factura_compra','recibo','orden_pago',etc.
  subtipo         TEXT,           -- 'efectivo_ars','tarjeta','transferencia', etc.
  nombre          TEXT NOT NULL,
  cuenta_debe_id  UUID REFERENCES contabilidad_plan_cuentas(id),
  cuenta_haber_id UUID REFERENCES contabilidad_plan_cuentas(id),
  diario_id       UUID REFERENCES contabilidad_diarios(id),
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── 9. EXTRACTOS BANCARIOS (Conciliación) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_extractos_banco (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  diario_id     UUID NOT NULL REFERENCES contabilidad_diarios(id),
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  saldo_inicial DECIMAL(18,2) DEFAULT 0,
  saldo_final   DECIMAL(18,2) DEFAULT 0,
  estado        TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador','conciliado')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contabilidad_extracto_lineas (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extracto_id         UUID NOT NULL REFERENCES contabilidad_extractos_banco(id) ON DELETE CASCADE,
  fecha               DATE NOT NULL,
  descripcion         TEXT,
  importe_debe        DECIMAL(18,2) DEFAULT 0,
  importe_haber       DECIMAL(18,2) DEFAULT 0,
  asiento_linea_id    UUID REFERENCES contabilidad_asientos_lineas(id),
  estado              TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','conciliada')),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── 10. FUNCIÓN: generar número de asiento ──────────────────────────────────
-- Genera el número correlativo para un asiento al momento de publicar.
-- Formato: [CÓDIGO_DIARIO]-[YY]-[NNNNN]
-- Ej: VTA-26-000001
CREATE OR REPLACE FUNCTION contabilidad_generar_numero_asiento(p_diario_id UUID, p_fecha DATE)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_codigo    TEXT;
  v_anio      INTEGER;
  v_anio_2d   TEXT;
  v_siguiente INTEGER;
BEGIN
  SELECT codigo INTO v_codigo FROM contabilidad_diarios WHERE id = p_diario_id;
  v_anio   := EXTRACT(YEAR FROM p_fecha)::INTEGER;
  v_anio_2d := RIGHT(v_anio::TEXT, 2);

  INSERT INTO contabilidad_diarios_secuencias (diario_id, anio, ultimo_numero)
  VALUES (p_diario_id, v_anio, 1)
  ON CONFLICT (diario_id, anio)
  DO UPDATE SET ultimo_numero = contabilidad_diarios_secuencias.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_siguiente;

  RETURN v_codigo || '-' || v_anio_2d || '-' || LPAD(v_siguiente::TEXT, 5, '0');
END;
$$;

-- ─── 11. FUNCIÓN: buscar período activo para una fecha ───────────────────────
CREATE OR REPLACE FUNCTION contabilidad_periodo_para_fecha(p_fecha DATE)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_periodo_id UUID;
BEGIN
  SELECT p.id INTO v_periodo_id
  FROM contabilidad_periodos p
  JOIN contabilidad_anos_fiscales af ON af.id = p.ano_fiscal_id
  WHERE p.fecha_inicio <= p_fecha
    AND p.fecha_fin    >= p_fecha
    AND p.estado NOT IN ('cerrado')
    AND af.estado = 'aprobado'
  ORDER BY p.fecha_inicio DESC
  LIMIT 1;

  RETURN v_periodo_id;
END;
$$;

-- ─── 12. TRIGGER: validar período cerrado antes de insertar asiento ──────────
CREATE OR REPLACE FUNCTION contabilidad_validar_periodo_abierto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_periodo_estado TEXT;
  v_periodo_nombre TEXT;
BEGIN
  IF NEW.periodo_id IS NOT NULL THEN
    SELECT estado, nombre INTO v_periodo_estado, v_periodo_nombre
    FROM contabilidad_periodos WHERE id = NEW.periodo_id;

    IF v_periodo_estado = 'cerrado' THEN
      RAISE EXCEPTION 'El período % está cerrado. No se pueden registrar movimientos.', v_periodo_nombre;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_validar_periodo_abierto ON contabilidad_asientos;
CREATE TRIGGER trig_validar_periodo_abierto
  BEFORE INSERT OR UPDATE ON contabilidad_asientos
  FOR EACH ROW EXECUTE FUNCTION contabilidad_validar_periodo_abierto();

-- ─── 13. TRIGGER: validar partida doble antes de publicar ───────────────────
CREATE OR REPLACE FUNCTION contabilidad_validar_partida_doble()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_suma_debe  DECIMAL(18,2);
  v_suma_haber DECIMAL(18,2);
BEGIN
  -- Solo validar cuando se publica
  IF NEW.estado = 'publicado' AND OLD.estado != 'publicado' THEN
    SELECT COALESCE(SUM(debe),0), COALESCE(SUM(haber),0)
    INTO v_suma_debe, v_suma_haber
    FROM contabilidad_asientos_lineas
    WHERE asiento_id = NEW.id;

    IF ABS(v_suma_debe - v_suma_haber) > 0.01 THEN
      RAISE EXCEPTION 'Partida doble inválida: DEBE=% HABER=%. Diferencia=%',
        v_suma_debe, v_suma_haber, (v_suma_debe - v_suma_haber);
    END IF;

    -- Asignar número de asiento al publicar
    IF NEW.numero IS NULL THEN
      NEW.numero := contabilidad_generar_numero_asiento(NEW.diario_id, NEW.fecha);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_validar_partida_doble ON contabilidad_asientos;
CREATE TRIGGER trig_validar_partida_doble
  BEFORE UPDATE ON contabilidad_asientos
  FOR EACH ROW EXECUTE FUNCTION contabilidad_validar_partida_doble();

-- ─── 14. ROW LEVEL SECURITY ─────────────────────────────────────────────────
-- Todos los usuarios pueden leer asientos
ALTER TABLE contabilidad_asientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contabilidad_asientos_select" ON contabilidad_asientos;
CREATE POLICY "contabilidad_asientos_select"
  ON contabilidad_asientos FOR SELECT USING (true);

ALTER TABLE contabilidad_asientos_lineas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contabilidad_asientos_lineas_select" ON contabilidad_asientos_lineas;
CREATE POLICY "contabilidad_asientos_lineas_select"
  ON contabilidad_asientos_lineas FOR SELECT USING (true);

-- Los inserts/updates los hace el service role (no RLS) o roles autorizados
-- INSERT/UPDATE policies se configuran según los roles del sistema

-- ─── FIN ────────────────────────────────────────────────────────────────────
