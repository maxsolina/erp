-- ============================================================
-- MIGRACIÓN: Módulo Depósito / Stock
-- ============================================================

-- 1. DEPÓSITOS
-- Cada sucursal tiene un depósito principal.
CREATE TABLE IF NOT EXISTS depositos (
  id            SERIAL PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,          -- CC, PN, CS
  nombre        TEXT NOT NULL,                 -- Casa Central
  sucursal_id   INTEGER REFERENCES sucursales(id) ON DELETE SET NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. UBICACIONES (dentro de cada depósito)
CREATE TABLE IF NOT EXISTS ubicaciones (
  id            SERIAL PRIMARY KEY,
  deposito_id   INTEGER NOT NULL REFERENCES depositos(id) ON DELETE RESTRICT,
  codigo        TEXT NOT NULL,                 -- CC/Stock, CC/En Reparacion
  nombre        TEXT NOT NULL,
  tipo          TEXT NOT NULL DEFAULT 'interna'
                  CHECK (tipo IN ('interna','transito','reparacion','scrap','devolucion')),
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  es_reparacion BOOLEAN NOT NULL DEFAULT FALSE,
  es_defecto    BOOLEAN NOT NULL DEFAULT FALSE, -- ubicación por defecto del depósito
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deposito_id, codigo)
);

-- 3. STOCK DE UNIDADES CON NÚMERO DE SERIE
-- Una fila por unidad física (celular, tablet, etc.)
CREATE TABLE IF NOT EXISTS stock_unidades (
  id              SERIAL PRIMARY KEY,
  producto_id     BIGINT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  ubicacion_id    INTEGER NOT NULL REFERENCES ubicaciones(id) ON DELETE RESTRICT,
  deposito_id     INTEGER NOT NULL REFERENCES depositos(id) ON DELETE RESTRICT,
  nro_serie       TEXT,                        -- IMEI / N° serie
  color           TEXT,
  bateria_pct     INTEGER,                     -- % batería al ingresar
  es_outlet       BOOLEAN NOT NULL DEFAULT FALSE,
  observaciones   TEXT,
  estado          TEXT NOT NULL DEFAULT 'disponible'
                    CHECK (estado IN ('disponible','reservado','en_reparacion','entregado','devuelto','dado_de_baja')),
  -- Documento origen
  origen_tipo     TEXT,                        -- 'recepcion', 'transferencia', 'ajuste', 'toma_equipo'
  origen_id       INTEGER,
  origen_numero   TEXT,
  -- Auditoría
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_unidades_producto    ON stock_unidades(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_unidades_ubicacion   ON stock_unidades(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_stock_unidades_deposito    ON stock_unidades(deposito_id);
CREATE INDEX IF NOT EXISTS idx_stock_unidades_estado      ON stock_unidades(estado);
CREATE INDEX IF NOT EXISTS idx_stock_unidades_nro_serie   ON stock_unidades(nro_serie);

-- 4. STOCK DE PRODUCTOS SIN NÚMERO DE SERIE (por ubicación)
-- Para accesorios, consumibles, etc.
CREATE TABLE IF NOT EXISTS stock_cantidades (
  id            SERIAL PRIMARY KEY,
  producto_id   BIGINT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  ubicacion_id  INTEGER NOT NULL REFERENCES ubicaciones(id) ON DELETE RESTRICT,
  deposito_id   INTEGER NOT NULL REFERENCES depositos(id) ON DELETE RESTRICT,
  cantidad      NUMERIC NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (producto_id, ubicacion_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_cantidades_producto  ON stock_cantidades(producto_id);
CREATE INDEX IF NOT EXISTS idx_stock_cantidades_ubicacion ON stock_cantidades(ubicacion_id);

-- 5. MOVIMIENTOS DE STOCK (log completo de todo movimiento)
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id                  SERIAL PRIMARY KEY,
  tipo                TEXT NOT NULL
                        CHECK (tipo IN (
                          'entrada_recepcion',
                          'salida_entrega',
                          'transferencia_salida',
                          'transferencia_entrada',
                          'ajuste_positivo',
                          'ajuste_negativo',
                          'entrada_toma_equipo',
                          'salida_devolucion_proveedor',
                          'entrada_devolucion_cliente',
                          'movimiento_reparacion',
                          'retorno_reparacion'
                        )),
  producto_id         BIGINT REFERENCES productos(id) ON DELETE SET NULL,
  producto_nombre     TEXT NOT NULL,
  ubicacion_origen_id INTEGER REFERENCES ubicaciones(id) ON DELETE SET NULL,
  ubicacion_destino_id INTEGER REFERENCES ubicaciones(id) ON DELETE SET NULL,
  deposito_origen_id  INTEGER REFERENCES depositos(id) ON DELETE SET NULL,
  deposito_destino_id INTEGER REFERENCES depositos(id) ON DELETE SET NULL,
  cantidad            NUMERIC NOT NULL DEFAULT 1,
  -- Para unidades con SN: referencia a la unidad
  stock_unidad_id     INTEGER REFERENCES stock_unidades(id) ON DELETE SET NULL,
  nro_serie           TEXT,
  -- Documento origen
  origen_tipo         TEXT,   -- 'recepcion', 'nota_venta', 'transferencia', 'ajuste', etc.
  origen_id           INTEGER,
  origen_numero       TEXT,
  -- Auditoría
  usuario             TEXT NOT NULL DEFAULT 'Admin',
  observaciones       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto  ON movimientos_stock(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_tipo      ON movimientos_stock(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_origen    ON movimientos_stock(origen_tipo, origen_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_fecha     ON movimientos_stock(created_at DESC);

-- 6. SEED DATA: depósito y ubicaciones para "Casa Central" (sucursal_id = 1)
INSERT INTO depositos (codigo, nombre, sucursal_id, activo)
VALUES ('CC', 'Casa Central', 1, TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ubicaciones (deposito_id, codigo, nombre, tipo, es_defecto)
SELECT d.id, 'CC/Stock', 'Stock Principal', 'interna', TRUE
FROM depositos d WHERE d.codigo = 'CC'
ON CONFLICT (deposito_id, codigo) DO NOTHING;

INSERT INTO ubicaciones (deposito_id, codigo, nombre, tipo, es_reparacion)
SELECT d.id, 'CC/Reparacion', 'En Reparación', 'reparacion', TRUE
FROM depositos d WHERE d.codigo = 'CC'
ON CONFLICT (deposito_id, codigo) DO NOTHING;

INSERT INTO ubicaciones (deposito_id, codigo, nombre, tipo)
SELECT d.id, 'CC/Deposito B', 'Depósito B', 'interna', FALSE
FROM depositos d WHERE d.codigo = 'CC'
ON CONFLICT (deposito_id, codigo) DO NOTHING;
