-- ============================================================
-- Cuenta Corriente Bimonetaria de Clientes
-- Tabla de movimientos (saldo calculado dinámicamente)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ventas_cc_movimientos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id           INTEGER NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  moneda               TEXT NOT NULL CHECK (moneda IN ('ARS', 'USD')),
  tipo_movimiento      TEXT NOT NULL CHECK (tipo_movimiento IN (
                         'factura', 'recibo', 'nota_credito', 'nota_debito',
                         'importe_a_cuenta', 'conciliacion_cruzada'
                       )),
  sentido              TEXT NOT NULL CHECK (sentido IN ('debe', 'haber')),
  importe              NUMERIC(18,2) NOT NULL CHECK (importe >= 0),
  -- Para conciliaciones cruzadas (ARS → USD o USD → ARS)
  importe_conversion   NUMERIC(18,2),
  cotizacion_aplicada  NUMERIC(18,4),
  tipo_cotizacion      TEXT CHECK (tipo_cotizacion IN ('oficial', 'blue', 'ccl', 'mep', 'divisa', 'billete')),
  -- Referencia al comprobante origen
  comprobante_tipo     TEXT NOT NULL,
  comprobante_id       UUID,
  comprobante_numero   TEXT,
  comprobante_id_int   INTEGER,   -- Para comprobantes con PK integer (facturas, recibos legacy)
  -- Trazabilidad
  fecha                DATE NOT NULL DEFAULT CURRENT_DATE,
  sucursal_id          INTEGER REFERENCES public.sucursales(id),
  usuario              TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ventas_cc_cliente_moneda
  ON public.ventas_cc_movimientos (cliente_id, moneda);

CREATE INDEX IF NOT EXISTS idx_ventas_cc_comprobante
  ON public.ventas_cc_movimientos (comprobante_tipo, comprobante_id_int);

CREATE INDEX IF NOT EXISTS idx_ventas_cc_fecha
  ON public.ventas_cc_movimientos (fecha);

-- Idempotencia: evitar duplicados por origen (tipo + id_int)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ventas_cc_origen_int
  ON public.ventas_cc_movimientos (comprobante_tipo, comprobante_id_int, sentido)
  WHERE comprobante_id_int IS NOT NULL;

-- Vista de saldos por cliente y moneda (calculada dinámicamente)
CREATE OR REPLACE VIEW public.ventas_cc_saldos AS
SELECT
  cliente_id,
  moneda,
  SUM(CASE WHEN sentido = 'debe' THEN importe ELSE -importe END) AS saldo
FROM public.ventas_cc_movimientos
GROUP BY cliente_id, moneda;

COMMENT ON TABLE public.ventas_cc_movimientos IS
  'Movimientos de cuenta corriente bimonetaria (ARS/USD) por cliente. El saldo se calcula dinámicamente.';
