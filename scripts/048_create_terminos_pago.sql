-- 048: Tabla de Términos de Pago
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING

CREATE TABLE IF NOT EXISTS terminos_pago (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  dias       INTEGER NOT NULL DEFAULT 0,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE terminos_pago ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'terminos_pago' AND policyname = 'allow_all_authenticated'
  ) THEN
    CREATE POLICY allow_all_authenticated ON terminos_pago
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Seed inicial
INSERT INTO terminos_pago (nombre, dias) VALUES
  ('Contado Efectivo',          0),
  ('Cuenta Corriente 30 días', 30),
  ('Cuenta Corriente 60 días', 60),
  ('Cuenta Corriente 90 días', 90)
ON CONFLICT (nombre) DO NOTHING;
