-- Agrega columnas faltantes a la tabla recepciones para soportar el flujo completo

ALTER TABLE public.recepciones
  ADD COLUMN IF NOT EXISTS documento_origen_tipo         TEXT DEFAULT 'oc',
  ADD COLUMN IF NOT EXISTS documento_origen_id           INTEGER,
  ADD COLUMN IF NOT EXISTS documento_origen_ref          TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sucursal                      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposito_destino              TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ubicacion                     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_esperada                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_recepcion_real          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remito_numero                 TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_remito                  DATE,
  ADD COLUMN IF NOT EXISTS recepcion_anterior_id         INTEGER,
  ADD COLUMN IF NOT EXISTS recepcion_complementaria_id   INTEGER;

-- Sincronizar recepciones existentes con sus OCs
UPDATE public.recepciones
SET
  documento_origen_tipo = 'oc',
  documento_origen_id   = orden_compra_id,
  documento_origen_ref  = COALESCE(orden_compra_numero, '')
WHERE orden_compra_id IS NOT NULL
  AND documento_origen_id IS NULL;
