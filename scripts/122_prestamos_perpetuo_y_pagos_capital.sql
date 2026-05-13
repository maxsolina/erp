-- ============================================================
-- 122 · Préstamos: sistema "perpetuo" + pagos de capital
--
-- 1. Agrega 'perpetuo' al check constraint de sistema_amortizacion.
-- 2. Agrega columna `tipo_pago` a prestamo_pagos para distinguir
--    pagos de cuota normal vs. pagos de capital extraordinarios.
-- ============================================================

-- 1. Permitir sistema_amortizacion = 'perpetuo'
ALTER TABLE public.prestamos
  DROP CONSTRAINT IF EXISTS prestamos_sistema_amortizacion_check;

ALTER TABLE public.prestamos
  ADD CONSTRAINT prestamos_sistema_amortizacion_check
  CHECK (sistema_amortizacion IN ('frances', 'aleman', 'americano', 'bullet', 'perpetuo'));

-- 2. tipo_pago en prestamo_pagos
ALTER TABLE public.prestamo_pagos
  ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(30) DEFAULT 'cuota';

-- valores: 'cuota' (default), 'capital_extra'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamo_pagos_tipo_pago_check'
  ) THEN
    ALTER TABLE public.prestamo_pagos
      ADD CONSTRAINT prestamo_pagos_tipo_pago_check
      CHECK (tipo_pago IN ('cuota', 'capital_extra'));
  END IF;
END $$;
