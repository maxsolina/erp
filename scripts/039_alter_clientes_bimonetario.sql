-- ============================================================
-- Ajustes al maestro de clientes para sistema bimonetario
-- ============================================================

-- 1. Tipo de cotización USD preferido por el cliente
--    (se usa para conversiones cruzadas ARS→USD en recibos)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_cotizacion_usd TEXT
    NOT NULL DEFAULT 'blue'
    CHECK (tipo_cotizacion_usd IN ('oficial', 'blue', 'ccl', 'mep'));

-- 2. Lista de precios por defecto directa en el cliente
--    (complementa la que viene de la categoría)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS lista_precios_id INTEGER
    REFERENCES public.listas_precios(id) ON DELETE SET NULL;

-- Índice para búsquedas por lista de precios
CREATE INDEX IF NOT EXISTS idx_clientes_lista_precios
  ON public.clientes (lista_precios_id)
  WHERE lista_precios_id IS NOT NULL;

COMMENT ON COLUMN public.clientes.tipo_cotizacion_usd IS
  'Cotización USD usada para conversiones cruzadas ARS→USD en recibos (blue/oficial/ccl/mep)';

COMMENT ON COLUMN public.clientes.lista_precios_id IS
  'Lista de precios por defecto del cliente. Si está vacía, se toma de la categoría del cliente.';
