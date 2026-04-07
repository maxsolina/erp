-- Agrega saldo_disponible a ajustes_clientes (Notas de Crédito/Débito)
-- Permite rastrear el saldo restante tras conciliaciones parciales

ALTER TABLE public.ajustes_clientes
  ADD COLUMN IF NOT EXISTS saldo_disponible NUMERIC(12,2);

-- Inicializar con el total actual para registros ya existentes
UPDATE public.ajustes_clientes
SET saldo_disponible = total
WHERE saldo_disponible IS NULL
  AND estado = 'publicado';

-- Registros en borrador o cancelado quedan en 0
UPDATE public.ajustes_clientes
SET saldo_disponible = 0
WHERE saldo_disponible IS NULL
  AND estado IN ('borrador', 'cancelado');
