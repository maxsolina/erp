-- ============================================================
-- Agrega conciliacion_id a ventas_cc_movimientos
-- Permite vincular las dos filas de una conciliación cruzada
-- (partida doble a nivel de cuenta corriente bimonetaria)
-- ============================================================

-- 1. Campo que vincula las dos filas de una conciliación cruzada
ALTER TABLE public.ventas_cc_movimientos
  ADD COLUMN IF NOT EXISTS conciliacion_id UUID NULL;

COMMENT ON COLUMN public.ventas_cc_movimientos.conciliacion_id IS
  'UUID compartido entre las dos filas de una conciliación cruzada ARS→USD.
   Fila CC ARS y fila CC USD del mismo cobro comparten este id.
   NULL si no es una conciliación cruzada.';

-- Índice para buscar rápidamente los dos lados de una conciliación
CREATE INDEX IF NOT EXISTS idx_ventas_cc_conciliacion
  ON public.ventas_cc_movimientos (conciliacion_id)
  WHERE conciliacion_id IS NOT NULL;

-- 2. Ampliar el check de tipo_movimiento para incluir conciliacion_cruzada
--    Primero eliminar el constraint existente y recrearlo con el nuevo valor
DO $$
BEGIN
  -- Buscar el nombre del constraint de check en tipo_movimiento
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'ventas_cc_movimientos'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause LIKE '%tipo_movimiento%'
  ) THEN
    -- Eliminar el constraint existente
    EXECUTE (
      SELECT 'ALTER TABLE public.ventas_cc_movimientos DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'ventas_cc_movimientos'
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause LIKE '%tipo_movimiento%'
      LIMIT 1
    );
  END IF;
END
$$;

ALTER TABLE public.ventas_cc_movimientos
  ADD CONSTRAINT chk_tipo_movimiento_cc
  CHECK (tipo_movimiento IN (
    'factura',
    'cobro',
    'nota_credito',
    'ajuste',
    'apertura',
    'conciliacion_cruzada'
  ));

-- 3. Actualizar la vista de saldos para reflejar la lógica correcta
--    El saldo de cada moneda se calcula SOLO con sus propias filas
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
  COUNT(*) AS cantidad_movimientos,
  MAX(fecha) AS ultimo_movimiento
FROM public.ventas_cc_movimientos
GROUP BY cliente_id, moneda;

COMMENT ON VIEW public.ventas_saldos_cc IS
  'Saldo de cuenta corriente por cliente y moneda.
   Saldo positivo = el cliente tiene deuda.
   Saldo negativo = el cliente tiene crédito a favor.
   Las conciliaciones cruzadas aparecen en AMBAS monedas con sentido haber.';
