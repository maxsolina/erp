-- ============================================================
-- 129 · Saldo disponible en NC/ND de compra
--
-- El endpoint /api/compras/ordenes-pago/[id]/confirmar ya intenta usar
-- nc.saldo_disponible cuando aplica una NC para cancelar deuda del proveedor,
-- pero la columna nunca existió en la tabla → el UPDATE falla silenciosamente.
--
-- Este script agrega la columna en NC y ND de compra (mirror de ajustes_clientes
-- en el lado de ventas, script add-saldo-disponible-nc.sql).
-- ============================================================

-- ─── Notas de Crédito de Compra ─────────────────────────────────────────────
ALTER TABLE public.notas_credito_compra
  ADD COLUMN IF NOT EXISTS saldo_disponible NUMERIC(15,2);

-- Inicializar con el total para las NCs ya confirmadas
UPDATE public.notas_credito_compra
SET saldo_disponible = total
WHERE saldo_disponible IS NULL
  AND estado NOT IN ('cancelada');

-- Las canceladas/aplicadas quedan en 0
UPDATE public.notas_credito_compra
SET saldo_disponible = 0
WHERE saldo_disponible IS NULL;

-- ─── Notas de Débito de Compra ──────────────────────────────────────────────
ALTER TABLE public.notas_debito_compra
  ADD COLUMN IF NOT EXISTS saldo_disponible NUMERIC(15,2);

UPDATE public.notas_debito_compra
SET saldo_disponible = total
WHERE saldo_disponible IS NULL
  AND estado NOT IN ('cancelada');

UPDATE public.notas_debito_compra
SET saldo_disponible = 0
WHERE saldo_disponible IS NULL;
