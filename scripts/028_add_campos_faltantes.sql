-- Agrega columnas faltantes detectadas por diagnóstico

-- 1. categoria_proveedor en proveedores (relación por nombre a categorias_proveedor)
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS categoria_proveedor TEXT DEFAULT NULL;

-- 2. asiento_id en facturas_compra (referencia al asiento contable)
ALTER TABLE facturas_compra
  ADD COLUMN IF NOT EXISTS asiento_id UUID REFERENCES contabilidad_asientos(id) ON DELETE SET NULL;

-- 3. Campos adicionales de proveedor que el frontend intenta guardar
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS posicion_fiscal         TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS celular                 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS calle_numero            TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provincia               TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS codigo_postal           TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS moneda_defecto          TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confidencial            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sucursal_origen         TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS observaciones           TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cuenta_analitica        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tipo_cotizacion_defecto TEXT DEFAULT NULL;
