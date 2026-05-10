-- ============================================================
-- 116 · Movimientos bancarios universales
--
-- Hasta ahora `movimientos_banco` se llenaba solo desde 4 operaciones
-- de Finanzas (depósitos, extracciones, transferencias, cheques negociados).
-- Pero el libro mayor del banco debería ver TODOS los movimientos que lo
-- afectan: recibos cobrados con banco, OPs pagadas con banco, etc.
--
-- Para conectar `caja_valores` (medio de pago) con `cuentas_bancarias`
-- (cuenta bancaria real) sin parchear matching por string, agregamos un
-- FK explícito en `caja_bancos_permitidos`.
--
-- Backfill: matcheamos por el número de cuenta embebido en el código
-- del banco_permitido (formato 'BCO-<numero>'), y de fallback por
-- nombre de banco.
-- ============================================================

-- ─── 1. FK explícito caja_bancos_permitidos → cuentas_bancarias ─────
ALTER TABLE public.caja_bancos_permitidos
  ADD COLUMN IF NOT EXISTS cuenta_bancaria_id UUID
    REFERENCES public.cuentas_bancarias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_caja_bancos_permitidos_cuenta_bancaria
  ON public.caja_bancos_permitidos(cuenta_bancaria_id);

-- ─── 2. Backfill por número de cuenta embebido en código ────────────
-- Formato típico del código: 'BCO-6546225' donde 6546225 es el numero_cuenta.
UPDATE public.caja_bancos_permitidos cbp
   SET cuenta_bancaria_id = cb.id
  FROM public.cuentas_bancarias cb
 WHERE cbp.cuenta_bancaria_id IS NULL
   AND cb.numero_cuenta = REGEXP_REPLACE(cbp.codigo, '^BCO-', '');

-- ─── 3. Fallback: match por nombre de banco (case-insensitive) ──────
UPDATE public.caja_bancos_permitidos cbp
   SET cuenta_bancaria_id = cb.id
  FROM public.cuentas_bancarias cb
 WHERE cbp.cuenta_bancaria_id IS NULL
   AND LOWER(cb.banco_nombre) = LOWER(cbp.banco_nombre);

-- ─── 4. estado_movimiento en movimientos_banco ──────────────────────
-- Mismo patrón que en movimientos_caja (script 110): los movimientos
-- cancelados se marcan, no se borran, para preservar la auditoría.
ALTER TABLE public.movimientos_banco
  ADD COLUMN IF NOT EXISTS estado_movimiento VARCHAR(20) DEFAULT 'confirmado';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimientos_banco_estado_movimiento_check'
  ) THEN
    ALTER TABLE public.movimientos_banco
      ADD CONSTRAINT movimientos_banco_estado_movimiento_check
      CHECK (estado_movimiento IN ('confirmado', 'cancelado'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
