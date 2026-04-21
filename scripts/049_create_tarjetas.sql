-- 049: Tablas de Tarjetas Financieras (tarjetas, grupos, cargos por grupo, recargos)
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT DO NOTHING

-- ─── Tarjetas ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tarjetas (
  id                  SERIAL PRIMARY KEY,
  nombre              TEXT NOT NULL UNIQUE,
  tipo                TEXT NOT NULL CHECK (tipo IN ('credito', 'debito', 'prepaga')),
  dias_presentacion   INTEGER NOT NULL DEFAULT 7,
  dias_pago           INTEGER NOT NULL DEFAULT 18,
  activa              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Grupos de tarjeta (procesadoras/bancos) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS grupos_tarjeta (
  id                  SERIAL PRIMARY KEY,
  nombre              TEXT NOT NULL UNIQUE,
  banco               TEXT,
  tipo_movimiento     TEXT,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Relación grupo-tarjeta ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grupos_tarjeta_tarjetas (
  grupo_id   INTEGER NOT NULL REFERENCES grupos_tarjeta(id) ON DELETE CASCADE,
  tarjeta_id INTEGER NOT NULL REFERENCES tarjetas(id) ON DELETE CASCADE,
  PRIMARY KEY (grupo_id, tarjeta_id)
);

-- ─── Cargos por grupo ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grupos_tarjeta_cargos (
  id               SERIAL PRIMARY KEY,
  grupo_id         INTEGER NOT NULL REFERENCES grupos_tarjeta(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  tipo             TEXT NOT NULL DEFAULT 'Gasto',
  arancel          NUMERIC(10,4) NOT NULL DEFAULT 0,
  es_porcentaje    BOOLEAN NOT NULL DEFAULT TRUE,
  cuenta_contable  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Recargos por cuota ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recargos_tarjeta (
  id             SERIAL PRIMARY KEY,
  sucursal_id    INTEGER,            -- NULL = aplica a todas
  tarjeta_id     INTEGER NOT NULL REFERENCES tarjetas(id) ON DELETE CASCADE,
  grupo_id       INTEGER NOT NULL REFERENCES grupos_tarjeta(id) ON DELETE CASCADE,
  desde_cuota    INTEGER NOT NULL DEFAULT 1,
  hasta_cuota    INTEGER NOT NULL DEFAULT 1,
  fecha_desde    DATE,
  fecha_hasta    DATE,
  recargo_pct    NUMERIC(10,4) NOT NULL DEFAULT 0,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  -- días de la semana en que aplica
  dia_lun        BOOLEAN NOT NULL DEFAULT TRUE,
  dia_mar        BOOLEAN NOT NULL DEFAULT TRUE,
  dia_mie        BOOLEAN NOT NULL DEFAULT TRUE,
  dia_jue        BOOLEAN NOT NULL DEFAULT TRUE,
  dia_vie        BOOLEAN NOT NULL DEFAULT TRUE,
  dia_sab        BOOLEAN NOT NULL DEFAULT TRUE,
  dia_dom        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE tarjetas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_tarjeta            ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_tarjeta_tarjetas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_tarjeta_cargos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE recargos_tarjeta          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tarjetas','grupos_tarjeta','grupos_tarjeta_tarjetas','grupos_tarjeta_cargos','recargos_tarjeta'] LOOP
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

-- ─── Seed inicial (datos de modulo-finanzas.tsx) ──────────────────────────────
INSERT INTO tarjetas (nombre, tipo, dias_presentacion, dias_pago) VALUES
  ('Visa',            'credito', 7, 18),
  ('Mastercard',      'credito', 7, 18),
  ('American Express','credito', 7, 21),
  ('Cabal',           'credito', 5, 15),
  ('Naranja',         'credito', 5, 15),
  ('Visa Electron',   'debito',  2,  3),
  ('Master Debit',    'debito',  2,  3),
  ('Maestro',         'debito',  2,  3),
  ('Cabal Débito',    'debito',  2,  3)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO grupos_tarjeta (nombre, banco, tipo_movimiento) VALUES
  ('Viumi',  'Banco Macro CC ARS',    'Acreditación de Tarjeta'),
  ('Payway', 'Banco Galicia ARS',     'Acreditación de Tarjeta')
ON CONFLICT (nombre) DO NOTHING;

-- Relaciones grupo-tarjeta
INSERT INTO grupos_tarjeta_tarjetas (grupo_id, tarjeta_id)
SELECT g.id, t.id FROM grupos_tarjeta g, tarjetas t
WHERE (g.nombre = 'Viumi'  AND t.nombre IN ('Visa','Mastercard','Visa Electron','Master Debit'))
   OR (g.nombre = 'Payway' AND t.nombre IN ('Visa','Mastercard','American Express','Visa Electron','Master Debit'))
ON CONFLICT DO NOTHING;

-- Cargos Viumi
INSERT INTO grupos_tarjeta_cargos (grupo_id, nombre, arancel, es_porcentaje, cuenta_contable)
SELECT g.id, c.nombre, c.arancel, TRUE, c.cuenta
FROM grupos_tarjeta g,
  (VALUES
    ('Comisión',        2.75, 'Comisiones Tarjeta'),
    ('IVA sobre comisión', 21, 'IVA Crédito Fiscal')
  ) AS c(nombre, arancel, cuenta)
WHERE g.nombre = 'Viumi'
ON CONFLICT DO NOTHING;

-- Cargos Payway
INSERT INTO grupos_tarjeta_cargos (grupo_id, nombre, arancel, es_porcentaje, cuenta_contable)
SELECT g.id, c.nombre, c.arancel, TRUE, c.cuenta
FROM grupos_tarjeta g,
  (VALUES
    ('Comisión',           2.5,  'Comisiones Tarjeta'),
    ('IVA sobre comisión', 21,   'IVA Crédito Fiscal'),
    ('Retención IIBB',     3,    'Retenciones IIBB')
  ) AS c(nombre, arancel, cuenta)
WHERE g.nombre = 'Payway'
ON CONFLICT DO NOTHING;
