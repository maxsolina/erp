-- ============================================================
-- 132 · Estados borrador / confirmada en NC y ND de Compra
--
-- Hasta hoy NC/ND de Compra usaban CHECK estado IN ('pendiente','aplicada','cancelada').
-- "pendiente" mezclaba dos conceptos: el borrador en edición y el confirmado disponible.
-- Esto rompía el flujo estándar del sistema (borrador → confirmada → aplicada).
--
-- Agrego 'borrador' y 'confirmada' al CHECK. Mantengo 'pendiente' para data vieja
-- que se mantiene como estaba (se trata como 'confirmada' a efectos de saldo).
-- ============================================================

-- ─── Notas de Crédito de Compra ─────────────────────────────────────────────
ALTER TABLE public.notas_credito_compra
  DROP CONSTRAINT IF EXISTS notas_credito_compra_estado_check;

ALTER TABLE public.notas_credito_compra
  ADD CONSTRAINT notas_credito_compra_estado_check
  CHECK (estado IN ('borrador','pendiente','confirmada','aplicada','cancelada'));

-- ─── Notas de Débito de Compra ──────────────────────────────────────────────
ALTER TABLE public.notas_debito_compra
  DROP CONSTRAINT IF EXISTS notas_debito_compra_estado_check;

ALTER TABLE public.notas_debito_compra
  ADD CONSTRAINT notas_debito_compra_estado_check
  CHECK (estado IN ('borrador','pendiente','confirmada','aplicada','cancelada'));

-- ─── asiento_id FK para guardar el link al asiento contable generado al confirmar ───
ALTER TABLE public.notas_credito_compra
  ADD COLUMN IF NOT EXISTS asiento_id UUID REFERENCES public.contabilidad_asientos(id) ON DELETE SET NULL;

ALTER TABLE public.notas_debito_compra
  ADD COLUMN IF NOT EXISTS asiento_id UUID REFERENCES public.contabilidad_asientos(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
