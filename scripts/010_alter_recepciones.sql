-- Agrega columnas faltantes a la tabla recepciones para soportar el flujo completo

ALTER TABLE public.recepciones
  ADD COLUMN IF NOT EXISTS documento_origen_tipo  TEXT DEFAULT 'oc',
  ADD COLUMN IF NOT EXISTS documento_origen_id    INTEGER,
  ADD COLUMN IF NOT EXISTS documento_origen_ref   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sucursal               TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposito_destino        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ubicacion              TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_esperada         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_recepcion_real   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remito_numero          TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_remito           DATE,
  ADD COLUMN IF NOT EXISTS recepcion_anterior_id  INTEGER REFERENCES public.recepciones(id),
  ADD COLUMN IF NOT EXISTS recepcion_complementaria_id INTEGER REFERENCES public.recepciones(id);

-- Actualizar restriccion de estado para soportar esperando_recepcion
ALTER TABLE public.recepciones DROP CONSTRAINT IF EXISTS recepciones_estado_check;
ALTER TABLE public.recepciones
  ADD CONSTRAINT recepciones_estado_check
  CHECK (estado IN ('borrador','confirmada','esperando_recepcion','parcial','completa','cancelada'));

-- Sincronizar recepciones existentes con sus OCs
UPDATE public.recepciones r
SET
  documento_origen_tipo = 'oc',
  documento_origen_id   = r.orden_compra_id,
  documento_origen_ref  = COALESCE(r.orden_compra_numero, '')
WHERE r.orden_compra_id IS NOT NULL
  AND r.documento_origen_id IS NULL;
