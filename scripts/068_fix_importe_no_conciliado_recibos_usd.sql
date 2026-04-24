-- ============================================================
-- 068 · Corrige importe_no_conciliado de recibos en USD
--
-- El cálculo anterior mezclaba el total ARS del recibo con
-- las imputaciones en USD, generando valores incorrectos.
-- Para cada recibo con moneda='USD', recalcula el saldo
-- como: sum(pagos USD) - sum(imputaciones USD).
-- ============================================================

UPDATE public.recibos r
SET importe_no_conciliado = GREATEST(0,
  -- Total USD pagado en este recibo
  COALESCE((
    SELECT SUM(p.importe)
    FROM public.recibo_pagos p
    WHERE p.recibo_id = r.id
      AND p.moneda = 'USD'
  ), 0)
  -
  -- Total USD imputado en comprobantes USD
  COALESCE((
    SELECT SUM(i.asignacion)
    FROM public.recibo_imputaciones i
    WHERE i.recibo_id = r.id
      AND (i.moneda_comprobante = 'USD' OR i.moneda_comprobante IS NULL)
  ), 0)
)
WHERE r.moneda = 'USD'
  AND r.estado = 'publicado';
