-- 052: Categorías de Ubicación (stock)
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING

CREATE TABLE IF NOT EXISTS categorias_ubicacion (
  id         SERIAL PRIMARY KEY,
  codigo     TEXT NOT NULL UNIQUE,
  nombre     TEXT NOT NULL,
  activa     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categorias_ubicacion ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categorias_ubicacion' AND policyname = 'allow_all_authenticated'
  ) THEN
    CREATE POLICY allow_all_authenticated ON categorias_ubicacion
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO categorias_ubicacion (codigo, nombre) VALUES
  ('STOCK',  'Stock Normal'),
  ('TRANS',  'Tránsito'),
  ('CUAR',   'Cuarentena'),
  ('DEV',    'Devoluciones'),
  ('EXPO',   'Exposición')
ON CONFLICT (codigo) DO NOTHING;
