-- ============================================================
-- Versiones de Listas de Precios + Líneas de Versión
-- ============================================================

-- Tabla principal: versiones_lista_precios
CREATE TABLE IF NOT EXISTS public.versiones_lista_precios (
  id                   BIGSERIAL PRIMARY KEY,
  lista_precios_id     BIGINT NOT NULL REFERENCES public.listas_precios(id) ON DELETE CASCADE,
  nombre               TEXT NOT NULL,
  fecha_inicial        DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_final          DATE,
  activa               BOOLEAN NOT NULL DEFAULT FALSE,
  estado               TEXT NOT NULL DEFAULT 'borrador'
                         CHECK (estado IN ('borrador', 'confirmada', 'activa', 'cerrada')),
  ultima_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seguimiento          JSONB NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versiones_lista_precios_lista_id
  ON public.versiones_lista_precios (lista_precios_id);

CREATE INDEX IF NOT EXISTS idx_versiones_lista_precios_estado
  ON public.versiones_lista_precios (estado);

-- Tabla de líneas: version_lista_precios_lineas
CREATE TABLE IF NOT EXISTS public.version_lista_precios_lineas (
  id                    BIGSERIAL PRIMARY KEY,
  version_id            BIGINT NOT NULL REFERENCES public.versiones_lista_precios(id) ON DELETE CASCADE,
  producto_id           BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  producto_codigo       TEXT NOT NULL DEFAULT '',
  producto_nombre       TEXT NOT NULL DEFAULT '',
  costo_moneda          TEXT NOT NULL DEFAULT 'ARS' CHECK (costo_moneda IN ('ARS', 'USD')),
  costo_importe         NUMERIC NOT NULL DEFAULT 0,
  cotizacion_dolar      NUMERIC NOT NULL DEFAULT 0,
  markup_porcentaje     NUMERIC NOT NULL DEFAULT 0,
  markup_nominal        NUMERIC NOT NULL DEFAULT 0,
  forzar_precio_pesos   BOOLEAN NOT NULL DEFAULT FALSE,
  precio_forzado_ars    NUMERIC,
  precio_venta          NUMERIC NOT NULL DEFAULT 0,
  precio_venta_moneda   TEXT NOT NULL DEFAULT 'ARS' CHECK (precio_venta_moneda IN ('ARS', 'USD')),
  iva                   NUMERIC NOT NULL DEFAULT 21,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_version_lineas_version_id
  ON public.version_lista_precios_lineas (version_id);

CREATE INDEX IF NOT EXISTS idx_version_lineas_producto_id
  ON public.version_lista_precios_lineas (producto_id);

-- Trigger updated_at para versiones
DROP TRIGGER IF EXISTS trg_versiones_lista_updated_at ON public.versiones_lista_precios;
CREATE TRIGGER trg_versiones_lista_updated_at
  BEFORE UPDATE ON public.versiones_lista_precios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger updated_at para líneas
DROP TRIGGER IF EXISTS trg_version_lineas_updated_at ON public.version_lista_precios_lineas;
CREATE TRIGGER trg_version_lineas_updated_at
  BEFORE UPDATE ON public.version_lista_precios_lineas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS desactivado (el ERP maneja autenticación propia)
ALTER TABLE public.versiones_lista_precios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.version_lista_precios_lineas DISABLE ROW LEVEL SECURITY;
