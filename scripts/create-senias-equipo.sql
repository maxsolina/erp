-- ============================================================
-- MIGRACIÓN: Seña de Equipo
-- ============================================================

CREATE TABLE IF NOT EXISTS senias_equipo (
  id                    BIGSERIAL PRIMARY KEY,
  numero                TEXT UNIQUE NOT NULL,            -- SE-00001
  fecha                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vendedor_id           BIGINT,
  sucursal_id           BIGINT,
  fecha_limite          DATE NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'en_curso', -- en_curso | confirmada | cancelada

  -- Cliente
  cliente_id            BIGINT NOT NULL,
  cliente_nombre        TEXT NOT NULL,

  -- Equipo del stock
  stock_item_id         BIGINT,
  equipo_nombre         TEXT NOT NULL DEFAULT '',
  equipo_imei           TEXT,
  equipo_color          TEXT,
  equipo_bateria        INT,

  -- Precios
  precio_venta          NUMERIC NOT NULL DEFAULT 0,
  descuento             NUMERIC NOT NULL DEFAULT 0,
  precio_final          NUMERIC NOT NULL DEFAULT 0,

  -- Seña (pago adelantado — puede ser 0)
  monto_senia           NUMERIC NOT NULL DEFAULT 0,
  medio_pago_senia      TEXT,
  estado_senia          TEXT NOT NULL DEFAULT 'sin_senia',  -- sin_senia | registrada
  recibo_senia_numero   TEXT,
  recibo_senia_id       BIGINT,

  -- Documentos vinculados (generados al crear la seña)
  nota_venta_id         BIGINT,
  nota_venta_numero     TEXT,
  oe_id                 BIGINT,
  oe_numero             TEXT,
  remito_id             BIGINT,
  remito_numero         TEXT,
  factura_id            BIGINT,
  factura_numero        TEXT,

  -- Cierre
  medios_pago_cierre    JSONB NOT NULL DEFAULT '[]',
  toma_equipo_id        BIGINT,

  -- Meta
  seguimiento           JSONB NOT NULL DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_senias_equipo_estado   ON senias_equipo(estado);
CREATE INDEX IF NOT EXISTS idx_senias_equipo_cliente  ON senias_equipo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_senias_equipo_sucursal ON senias_equipo(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_senias_equipo_fecha_limite ON senias_equipo(fecha_limite);
