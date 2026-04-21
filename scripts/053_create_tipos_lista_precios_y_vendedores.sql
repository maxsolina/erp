-- 053: Tipos de Lista de Precios y Vendedores
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING

-- ─── Tipos de Lista de Precios ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipos_lista_precios (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tipos_lista_precios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tipos_lista_precios' AND policyname = 'allow_all_authenticated'
  ) THEN
    CREATE POLICY allow_all_authenticated ON tipos_lista_precios
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO tipos_lista_precios (nombre) VALUES
  ('Minorista'), ('Mayorista'), ('Distribuidor'), ('Especial'), ('Promocional')
ON CONFLICT (nombre) DO NOTHING;

-- ─── Vendedores ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendedores (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  email      TEXT,
  sucursal   TEXT,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vendedores' AND policyname = 'allow_all_authenticated'
  ) THEN
    CREATE POLICY allow_all_authenticated ON vendedores
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
