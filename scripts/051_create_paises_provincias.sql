-- 051: Países y Provincias argentinas
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING

CREATE TABLE IF NOT EXISTS paises (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  codigo_iso TEXT,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provincias (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  pais_id    INTEGER REFERENCES paises(id) ON DELETE SET NULL,
  activa     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE paises    ENABLE ROW LEVEL SECURITY;
ALTER TABLE provincias ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['paises','provincias'] LOOP
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

-- Seed países
INSERT INTO paises (nombre, codigo_iso) VALUES
  ('Argentina',      'AR'), ('Bolivia',        'BO'), ('Brasil',         'BR'),
  ('Chile',          'CL'), ('Colombia',       'CO'), ('Ecuador',        'EC'),
  ('México',         'MX'), ('Paraguay',       'PY'), ('Perú',           'PE'),
  ('Uruguay',        'UY'), ('Venezuela',      'VE'), ('Alemania',       'DE'),
  ('Australia',      'AU'), ('Bélgica',        'BE'), ('Canadá',         'CA'),
  ('China',          'CN'), ('Corea del Sur',  'KR'), ('España',         'ES'),
  ('Estados Unidos', 'US'), ('Francia',        'FR'), ('India',          'IN'),
  ('Italia',         'IT'), ('Japón',          'JP'), ('Países Bajos',   'NL'),
  ('Portugal',       'PT'), ('Reino Unido',    'GB'), ('Rusia',          'RU'),
  ('Sudáfrica',      'ZA'), ('Suiza',          'CH'), ('Turquía',        'TR')
ON CONFLICT (nombre) DO NOTHING;

-- Seed provincias argentinas
INSERT INTO provincias (nombre, pais_id)
SELECT p.nombre, c.id
FROM (VALUES
  ('Buenos Aires'), ('Catamarca'), ('Chaco'), ('Chubut'), ('Córdoba'),
  ('Corrientes'), ('Entre Ríos'), ('Formosa'), ('Jujuy'), ('La Pampa'),
  ('La Rioja'), ('Mendoza'), ('Misiones'), ('Neuquén'), ('Río Negro'),
  ('Salta'), ('San Juan'), ('San Luis'), ('Santa Cruz'), ('Santa Fe'),
  ('Santiago del Estero'), ('Tierra del Fuego'), ('Tucumán')
) AS p(nombre)
CROSS JOIN (SELECT id FROM paises WHERE nombre = 'Argentina') AS c
ON CONFLICT (nombre) DO NOTHING;
