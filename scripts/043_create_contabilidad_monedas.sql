-- 043: Tablas de Monedas y Cotizaciones para Contabilidad
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING

-- ─── Monedas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_monedas (
  id                       SERIAL PRIMARY KEY,
  codigo                   TEXT NOT NULL UNIQUE,         -- 'ARS', 'USD', 'EUR'
  nombre                   TEXT NOT NULL,
  simbolo                  TEXT NOT NULL,
  moneda_afip              TEXT,
  es_base                  BOOLEAN NOT NULL DEFAULT FALSE,
  posicion_simbolo         TEXT NOT NULL DEFAULT 'antes'
                             CHECK (posicion_simbolo IN ('antes', 'despues')),
  factor_redondeo          NUMERIC(18,6) NOT NULL DEFAULT 0.01,
  precision_calculo        NUMERIC(18,6) NOT NULL DEFAULT 0.000001,
  tipo_cotizacion_defecto  TEXT DEFAULT 'oficial',
  cotizacion_automatica    BOOLEAN NOT NULL DEFAULT FALSE,
  activo                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Histórico de cotizaciones ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_cotizaciones (
  id         SERIAL PRIMARY KEY,
  moneda_id  INTEGER NOT NULL REFERENCES contabilidad_monedas(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL,
  tipo       TEXT NOT NULL,   -- 'oficial', 'blue', 'mep'
  tasa       NUMERIC(18,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contabilidad_cotizaciones_moneda_fecha
  ON contabilidad_cotizaciones(moneda_id, fecha DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE contabilidad_monedas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contabilidad_cotizaciones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contabilidad_monedas' AND policyname = 'allow_all_authenticated'
  ) THEN
    CREATE POLICY allow_all_authenticated ON contabilidad_monedas
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contabilidad_cotizaciones' AND policyname = 'allow_all_authenticated'
  ) THEN
    CREATE POLICY allow_all_authenticated ON contabilidad_cotizaciones
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ─── Seed inicial ─────────────────────────────────────────────────────────────
INSERT INTO contabilidad_monedas (codigo, nombre, simbolo, moneda_afip, es_base, posicion_simbolo, tipo_cotizacion_defecto, activo)
VALUES
  ('ARS', 'Peso Argentino',        '$',   'PES - Peso Argentino',          TRUE,  'antes', 'oficial', TRUE),
  ('USD', 'Dólar Estadounidense',  'US$', 'DOL - Dólar Estadounidense',    FALSE, 'antes', 'blue',    TRUE),
  ('EUR', 'Euro',                  '€',   'EUR - Euro',                    FALSE, 'antes', 'oficial', TRUE)
ON CONFLICT (codigo) DO NOTHING;
