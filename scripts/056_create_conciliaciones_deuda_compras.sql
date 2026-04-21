-- ============================================================
-- 056_create_conciliaciones_deuda_compras.sql
-- Tablas para conciliación bimonetaria de deuda con proveedores
-- ============================================================

-- Tabla principal de conciliaciones
CREATE TABLE IF NOT EXISTS public.conciliaciones_deuda_compras (
  id                BIGSERIAL PRIMARY KEY,
  fecha             TIMESTAMPTZ NOT NULL DEFAULT now(),
  proveedor_id      INTEGER NOT NULL REFERENCES public.proveedores(id),
  proveedor_nombre  TEXT,
  total_conciliado  DECIMAL(18,2) NOT NULL DEFAULT 0,
  usuario           TEXT,
  sucursal_id       INTEGER REFERENCES public.sucursales(id),
  estado            TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'cancelada')),
  fecha_cancelacion TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de aplicaciones (líneas de cada conciliación)
CREATE TABLE IF NOT EXISTS public.conciliaciones_deuda_compras_aplicaciones (
  id              BIGSERIAL PRIMARY KEY,
  conciliacion_id BIGINT NOT NULL REFERENCES public.conciliaciones_deuda_compras(id) ON DELETE CASCADE,
  debito_tipo     TEXT,
  debito_numero   TEXT,
  credito_tipo    TEXT,
  credito_numero  TEXT,
  monto           DECIMAL(18,2) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cdc_proveedor ON public.conciliaciones_deuda_compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_cdc_estado    ON public.conciliaciones_deuda_compras(estado);
CREATE INDEX IF NOT EXISTS idx_cdca_conc     ON public.conciliaciones_deuda_compras_aplicaciones(conciliacion_id);

-- Columnas para notas de crédito de compra
ALTER TABLE public.notas_credito_compra
  ADD COLUMN IF NOT EXISTS saldo_disponible NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS moneda           TEXT DEFAULT 'ARS';

-- RLS
ALTER TABLE public.conciliaciones_deuda_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conciliaciones_deuda_compras_aplicaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_conciliaciones_deuda_compras"        ON public.conciliaciones_deuda_compras;
DROP POLICY IF EXISTS "allow_all_conciliaciones_deuda_compras_apls"   ON public.conciliaciones_deuda_compras_aplicaciones;

CREATE POLICY "allow_all_conciliaciones_deuda_compras"
  ON public.conciliaciones_deuda_compras FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_conciliaciones_deuda_compras_apls"
  ON public.conciliaciones_deuda_compras_aplicaciones FOR ALL USING (true) WITH CHECK (true);
