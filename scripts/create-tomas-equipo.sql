-- ============================================================
-- Tabla: tomas_equipo
-- Registra cada toma de equipo usado como parte de pago
-- ============================================================
CREATE TABLE IF NOT EXISTS tomas_equipo (
  id                   SERIAL PRIMARY KEY,
  numero               TEXT NOT NULL UNIQUE,
  fecha                TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_id           INTEGER REFERENCES clientes(id),
  cliente_nombre       TEXT NOT NULL,
  modelo_equipo        TEXT NOT NULL,
  precio_base          NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuentos           NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_final         NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado               TEXT NOT NULL DEFAULT 'confirmado' CHECK (estado IN ('borrador','confirmado','cancelado')),
  estado_recepcion     TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_recepcion IN ('pendiente','recibido','cancelado')),
  recepcion_numero     TEXT,
  nota_credito_numero  TEXT,
  sucursal_id          INTEGER REFERENCES sucursales(id),
  evaluacion           JSONB NOT NULL DEFAULT '[]',   -- [{componente, estado, descuento}]
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Tabla: ajustes_clientes
-- Notas de crédito / débito en cuenta corriente de clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS ajustes_clientes (
  id                   SERIAL PRIMARY KEY,
  numero               TEXT NOT NULL UNIQUE,
  fecha                TIMESTAMPTZ NOT NULL DEFAULT now(),
  cliente_id           INTEGER REFERENCES clientes(id),
  cliente_nombre       TEXT NOT NULL,
  estado               TEXT NOT NULL DEFAULT 'publicado' CHECK (estado IN ('borrador','publicado','cancelado')),
  concepto             TEXT NOT NULL,
  moneda               TEXT NOT NULL DEFAULT 'ARS',
  categoria            TEXT,
  nota_venta_numero    TEXT,
  toma_equipo_id       INTEGER REFERENCES tomas_equipo(id),
  sucursal_id          INTEGER REFERENCES sucursales(id),
  lineas               JSONB NOT NULL DEFAULT '[]',   -- [{descripcion, importe, fecha_vencimiento}]
  total                NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Tabla: recepciones_toma
-- Recepción de compra generada automáticamente por la toma
-- ============================================================
CREATE TABLE IF NOT EXISTS recepciones_toma (
  id                   SERIAL PRIMARY KEY,
  numero               TEXT NOT NULL UNIQUE,
  fecha                TIMESTAMPTZ NOT NULL DEFAULT now(),
  toma_equipo_id       INTEGER REFERENCES tomas_equipo(id),
  toma_equipo_numero   TEXT NOT NULL,
  proveedor_nombre     TEXT NOT NULL,
  estado               TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','confirmado','cancelado')),
  observaciones        TEXT,
  lineas               JSONB NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tomas_equipo_cliente_id ON tomas_equipo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tomas_equipo_estado ON tomas_equipo(estado);
CREATE INDEX IF NOT EXISTS idx_ajustes_clientes_cliente_id ON ajustes_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_clientes_toma_id ON ajustes_clientes(toma_equipo_id);
CREATE INDEX IF NOT EXISTS idx_recepciones_toma_toma_id ON recepciones_toma(toma_equipo_id);

-- RLS
ALTER TABLE tomas_equipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE ajustes_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepciones_toma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_tomas_equipo" ON tomas_equipo FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ajustes_clientes" ON ajustes_clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_recepciones_toma" ON recepciones_toma FOR ALL USING (true) WITH CHECK (true);
