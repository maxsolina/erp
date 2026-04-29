-- ============================================================================
-- 082_factura_medios_pago.sql
-- Tabla `factura_medios_pago`: guarda el desglose de medios de pago elegidos
-- al confirmar una factura. Cada fila = un medio (efectivo, tarjeta, transf).
--
-- También agrega 2 columnas a `facturas`:
--   - asiento_id           → FK al asiento "negro" (asiento 1)
--   - asiento_iva_id       → FK al asiento de IVA + recargo (asiento 2)
--
-- IDEMPOTENTE
-- ============================================================================

-- ── 1. Columnas en facturas ──────────────────────────────────────────────────
ALTER TABLE public.facturas
  ADD COLUMN IF NOT EXISTS asiento_id     UUID REFERENCES public.contabilidad_asientos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS asiento_iva_id UUID REFERENCES public.contabilidad_asientos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS facturas_asiento_id_idx     ON public.facturas(asiento_id)     WHERE asiento_id     IS NOT NULL;
CREATE INDEX IF NOT EXISTS facturas_asiento_iva_id_idx ON public.facturas(asiento_iva_id) WHERE asiento_iva_id IS NOT NULL;

-- ── 2. Tabla factura_medios_pago ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.factura_medios_pago (
  id              BIGSERIAL PRIMARY KEY,
  factura_id      INTEGER NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,

  -- Medio de pago
  medio           TEXT    NOT NULL CHECK (medio IN ('efectivo', 'transferencia', 'tarjeta')),
  tarjeta_id      INTEGER REFERENCES public.tarjetas(id),
  cuotas          INTEGER,

  -- Importes (en moneda de la factura)
  monto_base      NUMERIC(14,2) NOT NULL DEFAULT 0,   -- lo que paga el cliente sobre el subtotal en negro
  iva_calculado   NUMERIC(14,2) NOT NULL DEFAULT 0,   -- IVA proporcional (0 si efectivo)
  recargo         NUMERIC(14,2) NOT NULL DEFAULT 0,   -- recargo tarjeta (0 si efectivo o transf)
  monto_total     NUMERIC(14,2) NOT NULL DEFAULT 0,   -- monto_base + iva_calculado + recargo

  -- Auditoría
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT factura_medios_pago_tarjeta_ok
    CHECK (medio <> 'tarjeta' OR (tarjeta_id IS NOT NULL AND cuotas IS NOT NULL)),

  CONSTRAINT factura_medios_pago_iva_efectivo
    CHECK (medio <> 'efectivo' OR iva_calculado = 0),

  CONSTRAINT factura_medios_pago_recargo_solo_tarjeta
    CHECK (medio = 'tarjeta' OR recargo = 0)
);

CREATE INDEX IF NOT EXISTS factura_medios_pago_factura_id_idx ON public.factura_medios_pago(factura_id);

-- RLS deshabilitado: gestionado a través del API server-side
ALTER TABLE public.factura_medios_pago DISABLE ROW LEVEL SECURITY;

-- ── 3. Verificación ──────────────────────────────────────────────────────────
SELECT
  column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'factura_medios_pago'
ORDER BY ordinal_position;
