-- ============================================================================
-- Migracion: normalizar esquema de recibos para Ventas v2
-- Objetivo: compatibilizar tablas existentes (legacy) con el flujo actual
-- Idempotente: SI
-- ============================================================================

ALTER TABLE IF EXISTS recibos
  ADD COLUMN IF NOT EXISTS caja_id UUID REFERENCES cajas(id),
  ADD COLUMN IF NOT EXISTS caja_nombre VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nota_venta_id UUID,
  ADD COLUMN IF NOT EXISTS nota_venta_numero VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cobrador_id UUID,
  ADD COLUMN IF NOT EXISTS cobrador_nombre VARCHAR(100),
  ADD COLUMN IF NOT EXISTS concepto VARCHAR(200),
  ADD COLUMN IF NOT EXISTS importe DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS importe_no_conciliado DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_cotizacion VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cotizacion DECIMAL(15,4),
  ADD COLUMN IF NOT EXISTS fecha_publicacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS observaciones TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Garantizar estado con default en instalaciones legacy
ALTER TABLE IF EXISTS recibos
  ALTER COLUMN estado SET DEFAULT 'borrador';

-- Quitar cualquier CHECK legacy sobre estado antes de tocar datos
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'recibos'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%estado%'
  LOOP
    EXECUTE format('ALTER TABLE recibos DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Normalizar estados legacy antes de aplicar el CHECK definitivo
UPDATE recibos
SET estado = CASE
  WHEN estado IS NULL THEN 'borrador'
  WHEN estado IN ('publicado', 'confirmado', 'conciliado', 'abierta', 'activa', 'creada', 'esperando_confirmacion') THEN 'publicado'
  WHEN estado IN ('cancelado', 'cancelada', 'anulado', 'anulada', 'inactiva') THEN 'cancelado'
  ELSE 'borrador'
END
WHERE estado IS NULL OR estado NOT IN ('borrador', 'publicado', 'cancelado');

-- CHECK esperado de este modulo
ALTER TABLE IF EXISTS recibos
  ADD CONSTRAINT recibos_estado_check
  CHECK (estado IN ('borrador', 'publicado', 'cancelado'));

-- Indices utiles para filtros y validaciones del flujo
CREATE INDEX IF NOT EXISTS idx_recibos_estado ON recibos(estado);
CREATE INDEX IF NOT EXISTS idx_recibos_caja_id ON recibos(caja_id);
CREATE INDEX IF NOT EXISTS idx_recibos_cliente_id ON recibos(cliente_id);

-- Actualizar timestamp en registros antiguos si quedo NULL
UPDATE recibos
SET updated_at = COALESCE(updated_at, now())
WHERE updated_at IS NULL;
