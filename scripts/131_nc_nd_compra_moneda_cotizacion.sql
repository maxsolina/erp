-- ============================================================
-- 131 · Multi-moneda en NC / ND de Compra
--
-- Hasta hoy, notas_credito_compra y notas_debito_compra no tenían columnas
-- de moneda / cotización. Implícitamente todo se asumía en ARS, lo que
-- impide registrar notas de proveedores en USD/EUR con su cotización.
--
-- Este script alinea el schema con el de facturas_compra (que ya soporta
-- multi-moneda desde hace tiempo).
-- ============================================================

-- ─── Notas de Crédito de Compra ─────────────────────────────────────────────
ALTER TABLE public.notas_credito_compra
  ADD COLUMN IF NOT EXISTS moneda          VARCHAR(10) NOT NULL DEFAULT 'ARS'
    CHECK (moneda IN ('ARS','USD','EUR')),
  ADD COLUMN IF NOT EXISTS tipo_cotizacion VARCHAR(20)
    CHECK (tipo_cotizacion IS NULL OR tipo_cotizacion IN ('oficial','blue','mep')),
  ADD COLUMN IF NOT EXISTS cotizacion      DECIMAL(15,4);

-- ─── Notas de Débito de Compra ──────────────────────────────────────────────
ALTER TABLE public.notas_debito_compra
  ADD COLUMN IF NOT EXISTS moneda          VARCHAR(10) NOT NULL DEFAULT 'ARS'
    CHECK (moneda IN ('ARS','USD','EUR')),
  ADD COLUMN IF NOT EXISTS tipo_cotizacion VARCHAR(20)
    CHECK (tipo_cotizacion IS NULL OR tipo_cotizacion IN ('oficial','blue','mep')),
  ADD COLUMN IF NOT EXISTS cotizacion      DECIMAL(15,4);

-- Refresh schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
