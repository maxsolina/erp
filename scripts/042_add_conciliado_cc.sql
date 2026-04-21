-- ============================================================
-- Agrega campos de conciliación a ventas_cc_movimientos
-- Para marcar movimientos como conciliados desde la pantalla
-- de Conciliación de Deuda bimonetaria
-- ============================================================

-- 1. Campo que indica si el movimiento fue conciliado
ALTER TABLE public.ventas_cc_movimientos
  ADD COLUMN IF NOT EXISTS conciliado BOOLEAN NOT NULL DEFAULT false;

-- 2. Id del proceso de conciliación que lo marcó
ALTER TABLE public.ventas_cc_movimientos
  ADD COLUMN IF NOT EXISTS conciliacion_ejecutada_id UUID NULL;

COMMENT ON COLUMN public.ventas_cc_movimientos.conciliado IS
  'true cuando este movimiento fue conciliado contra un crédito/débito equivalente.';

COMMENT ON COLUMN public.ventas_cc_movimientos.conciliacion_ejecutada_id IS
  'UUID del proceso de conciliación que marcó este movimiento como conciliado.
   Permite agrupar y revertir todas las filas de una misma ejecución.';

-- Índice para filtrar pendientes de conciliación rápidamente
CREATE INDEX IF NOT EXISTS idx_ventas_cc_conciliado
  ON public.ventas_cc_movimientos (cliente_id, moneda, conciliado)
  WHERE conciliado = false;

-- 3. Recrear vista incluyendo campo conciliado en el filtro de saldo pendiente
DROP VIEW IF EXISTS public.ventas_saldos_cc;

CREATE VIEW public.ventas_saldos_cc AS
SELECT
  cliente_id,
  moneda,
  SUM(
    CASE WHEN sentido = 'debe' THEN importe
         ELSE -importe
    END
  ) AS saldo,
  SUM(
    CASE WHEN sentido = 'debe' AND NOT conciliado THEN importe
         WHEN sentido = 'haber' AND NOT conciliado THEN -importe
         ELSE 0
    END
  ) AS saldo_pendiente,
  COUNT(*) FILTER (WHERE NOT conciliado) AS movimientos_pendientes,
  MAX(fecha) AS ultimo_movimiento
FROM public.ventas_cc_movimientos
GROUP BY cliente_id, moneda;

COMMENT ON VIEW public.ventas_saldos_cc IS
  'saldo = total (conciliados y no conciliados).
   saldo_pendiente = solo los no conciliados todavía.
   Saldo positivo = deuda del cliente. Negativo = crédito a favor.';
