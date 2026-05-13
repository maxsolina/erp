-- ============================================================
-- 124 · Préstamos: acreditación opcional en cuenta bancaria
--
-- Hoy un préstamo solo puede acreditarse en caja (campo caja_id).
-- Algunos préstamos llegan directo al banco; agregamos la opción
-- cuenta_bancaria_acreditacion_id para esos casos.
--
-- Reglas:
--   * Si tiene caja_id → acreditación en efectivo (igual que ahora).
--   * Si tiene cuenta_bancaria_acreditacion_id → acreditación en banco.
--   * No deberían usarse los dos al mismo tiempo.
-- ============================================================

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_acreditacion_id UUID
    REFERENCES public.cuentas_bancarias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_acreditacion_nombre VARCHAR(200);
