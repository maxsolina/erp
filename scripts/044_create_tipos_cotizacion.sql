-- 044: Tabla de Tipos de Cotización para Contabilidad
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING

-- ─── Tipos de Cotización ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contabilidad_tipos_cotizacion (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE contabilidad_tipos_cotizacion ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contabilidad_tipos_cotizacion' AND policyname = 'allow_all_authenticated'
  ) THEN
    CREATE POLICY allow_all_authenticated ON contabilidad_tipos_cotizacion
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ─── Seed inicial ─────────────────────────────────────────────────────────────
INSERT INTO contabilidad_tipos_cotizacion (nombre, descripcion, activo)
VALUES
  ('oficial',  'Cotización oficial del BCRA',            TRUE),
  ('blue',     'Cotización mercado paralelo (dólar blue)', TRUE),
  ('mep',      'Dólar bursátil / MEP',                   TRUE),
  ('ccl',      'Contado con liquidación',                 TRUE),
  ('crypto',   'Cotización referencia criptomonedas',     TRUE),
  ('mayorista','Dólar mayorista BCRA',                    TRUE)
ON CONFLICT (nombre) DO NOTHING;
