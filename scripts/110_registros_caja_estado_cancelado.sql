-- ============================================================
-- 110 · Estado "cancelado" para registros de caja y banco
--
-- Hoy el CHECK permite solo 'borrador' / 'confirmado'. Cuando un
-- registro confirmado se cancela queremos un estado terminal propio
-- — no volver a borrador (que es editable y permite re-confirmar
-- sin dejar rastro). El estado "cancelado" es:
--   • Audit-friendly (queda visible que se canceló)
--   • Read-only (no se permite editar ni re-confirmar)
--   • Terminal (la única forma de "deshacer" sería borrar la fila)
-- ============================================================

-- ─── 1. registros_caja ──────────────────────────────────────
ALTER TABLE public.registros_caja
  DROP CONSTRAINT IF EXISTS registros_caja_estado_check;

ALTER TABLE public.registros_caja
  ADD CONSTRAINT registros_caja_estado_check
  CHECK (estado IN ('borrador', 'confirmado', 'cancelado'));

-- ─── 2. registros_banco ─────────────────────────────────────
ALTER TABLE public.registros_banco
  DROP CONSTRAINT IF EXISTS registros_banco_estado_check;

ALTER TABLE public.registros_banco
  ADD CONSTRAINT registros_banco_estado_check
  CHECK (estado IN ('borrador', 'confirmado', 'cancelado'));

-- ─── 3. Refresh schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';
