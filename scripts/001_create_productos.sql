-- Tabla: productos (Maestro de Productos)
CREATE TABLE IF NOT EXISTS public.productos (
  id                         BIGSERIAL PRIMARY KEY,

  -- Cabecera
  imagen_url                 TEXT,
  nombre                     TEXT NOT NULL,
  codigo_interno             TEXT NOT NULL UNIQUE,
  categoria                  TEXT NOT NULL DEFAULT '',
  marca                      TEXT NOT NULL DEFAULT '',
  modelo                     TEXT NOT NULL DEFAULT '',
  color                      TEXT NOT NULL DEFAULT '',
  tipo                       TEXT NOT NULL DEFAULT 'almacenable' CHECK (tipo IN ('almacenable', 'servicio', 'consumible')),
  puede_venderse             BOOLEAN NOT NULL DEFAULT TRUE,
  puede_comprarse            BOOLEAN NOT NULL DEFAULT TRUE,
  activo                     BOOLEAN NOT NULL DEFAULT TRUE,

  -- Inventario
  stock_real                 NUMERIC NOT NULL DEFAULT 0,
  stock_minimo               NUMERIC NOT NULL DEFAULT 0,
  stock_maximo               NUMERIC NOT NULL DEFAULT 0,
  stock_critico              NUMERIC NOT NULL DEFAULT 0,
  tiene_numero_serie         BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_color             BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_bateria           BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_outlet            BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_observaciones     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Abastecimiento / Costos
  costo_manual               NUMERIC NOT NULL DEFAULT 0,
  moneda_costo               TEXT NOT NULL DEFAULT 'ARS',
  costo_contable             NUMERIC NOT NULL DEFAULT 0,
  historial_costos           JSONB NOT NULL DEFAULT '[]',

  -- Ventas / Garantías
  garantia_propia_valor      NUMERIC NOT NULL DEFAULT 0,
  garantia_propia_unidad     TEXT NOT NULL DEFAULT 'meses' CHECK (garantia_propia_unidad IN ('meses', 'dias')),
  garantia_fabricante_valor  NUMERIC NOT NULL DEFAULT 0,
  garantia_fabricante_unidad TEXT NOT NULL DEFAULT 'meses' CHECK (garantia_fabricante_unidad IN ('meses', 'dias')),

  -- Contabilidad
  iva_venta                  NUMERIC NOT NULL DEFAULT 21,
  iva_compra                 NUMERIC NOT NULL DEFAULT 21,
  cuenta_ventas              TEXT NOT NULL DEFAULT '',
  cuenta_existencias         TEXT NOT NULL DEFAULT '',

  -- Observaciones
  observaciones              TEXT NOT NULL DEFAULT '',

  -- Auditoría
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_productos_codigo_interno ON public.productos (codigo_interno);
CREATE INDEX IF NOT EXISTS idx_productos_activo        ON public.productos (activo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria     ON public.productos (categoria);
CREATE INDEX IF NOT EXISTS idx_productos_tipo          ON public.productos (tipo);

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_productos_updated_at ON public.productos;
CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS desactivado (el ERP maneja autenticación propia)
ALTER TABLE public.productos DISABLE ROW LEVEL SECURITY;
