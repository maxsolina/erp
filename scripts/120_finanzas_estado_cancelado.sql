-- ============================================================
-- 120 · Estado "cancelado" para operaciones financieras
--
-- Habilita el estado `cancelado` (terminal) en:
--   - depositos_bancarios
--   - extracciones
--   - conversiones_moneda
--   - transferencias_bancarias (por consistencia, aunque su flow
--     de cancelación se agregará más adelante)
--
-- Los check constraints actuales solo permiten 'borrador' / 'publicado'.
-- Una operación cancelada deja sus movimientos_caja marcados como
-- `cancelado` y su asiento revertido con un asiento de reversa.
-- ============================================================

-- ─── depositos_bancarios ────────────────────────────────────
ALTER TABLE public.depositos_bancarios
  DROP CONSTRAINT IF EXISTS depositos_bancarios_estado_check;

ALTER TABLE public.depositos_bancarios
  ADD CONSTRAINT depositos_bancarios_estado_check
  CHECK (estado IN ('borrador', 'deposito_pendiente', 'publicado', 'cancelado'));

-- ─── extracciones ───────────────────────────────────────────
ALTER TABLE public.extracciones
  DROP CONSTRAINT IF EXISTS extracciones_estado_check;

ALTER TABLE public.extracciones
  ADD CONSTRAINT extracciones_estado_check
  CHECK (estado IN ('borrador', 'publicado', 'cancelado'));

-- ─── conversiones_moneda ────────────────────────────────────
ALTER TABLE public.conversiones_moneda
  DROP CONSTRAINT IF EXISTS conversiones_moneda_estado_check;

ALTER TABLE public.conversiones_moneda
  ADD CONSTRAINT conversiones_moneda_estado_check
  CHECK (estado IN ('borrador', 'publicado', 'cancelado'));

-- ─── transferencias_bancarias (consistencia futura) ─────────
ALTER TABLE public.transferencias_bancarias
  DROP CONSTRAINT IF EXISTS transferencias_bancarias_estado_check;

ALTER TABLE public.transferencias_bancarias
  ADD CONSTRAINT transferencias_bancarias_estado_check
  CHECK (estado IN ('borrador', 'publicado', 'cancelado'));
