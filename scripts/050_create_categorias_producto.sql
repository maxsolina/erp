-- 050: Categorías de producto, Marcas y Colores
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING

CREATE TABLE IF NOT EXISTS categorias_producto (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  activa     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marcas_producto (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  activa     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS colores_producto (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  hex        TEXT,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categorias_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas_producto     ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores_producto    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['categorias_producto','marcas_producto','colores_producto'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'allow_all_authenticated'
    ) THEN
      EXECUTE format(
        'CREATE POLICY allow_all_authenticated ON %I FOR ALL USING (auth.role() = ''authenticated'')',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- Seed categorías
INSERT INTO categorias_producto (nombre) VALUES
  ('Celulares'), ('Accesorios'), ('Repuestos'), ('Servicios'),
  ('Usados'), ('Tablets'), ('Laptops'), ('Audio'), ('Fundas y Protectores')
ON CONFLICT (nombre) DO NOTHING;

-- Seed marcas
INSERT INTO marcas_producto (nombre) VALUES
  ('Apple'), ('Samsung'), ('Motorola'), ('Xiaomi'), ('Huawei'),
  ('LG'), ('Sony'), ('OnePlus'), ('Genérica')
ON CONFLICT (nombre) DO NOTHING;

-- Seed colores
INSERT INTO colores_producto (nombre) VALUES
  ('Negro'), ('Blanco'), ('Azul'), ('Rojo'), ('Verde'),
  ('Oro'), ('Plata'), ('Rosa'), ('Violeta'), ('Transparente'), ('Gris')
ON CONFLICT (nombre) DO NOTHING;
