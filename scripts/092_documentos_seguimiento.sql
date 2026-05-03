-- ============================================================================
-- Tabla genérica de seguimiento / auditoría de documentos del ERP.
--
-- Sirve para todos los documentos: NVs, OEs, remitos, facturas, recibos, etc.
-- Cada fila es un evento (creación, cambio de estado, edición de un campo,
-- nota manual). El frontend lo muestra como un panel de seguimiento al pie
-- de la ficha del documento.
--
-- Para esta primera implementación solo la NV escribe acá; más adelante se
-- enchufan los otros documentos sin tocar el schema (la tabla ya es genérica).
-- ============================================================================

CREATE TABLE IF NOT EXISTS documentos_seguimiento (
  id BIGSERIAL PRIMARY KEY,

  -- A qué documento corresponde el evento.
  -- documento_id es TEXT porque algunos docs usan UUID (recibos) y otros bigint.
  tipo_documento TEXT NOT NULL,
  documento_id TEXT NOT NULL,

  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Tipo de evento. Conjunto cerrado.
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'creacion',
    'cambio_estado',
    'cambio_campo',
    'nota',
    'mensaje'
  )),

  -- Datos del evento (todos opcionales según el tipo).
  campo TEXT,                  -- nombre del campo modificado (cambio_campo)
  valor_anterior TEXT,         -- valor previo (cambio_estado / cambio_campo)
  valor_nuevo TEXT,            -- valor nuevo  (cambio_estado / cambio_campo)
  descripcion TEXT,            -- texto libre (creacion / nota / mensaje)
  usuario TEXT,                -- nombre / email del usuario que disparó el evento
  metadata JSONB               -- payload extra opcional (no usado en MVP)
);

CREATE INDEX IF NOT EXISTS idx_documentos_seguimiento_doc
  ON documentos_seguimiento(tipo_documento, documento_id);

CREATE INDEX IF NOT EXISTS idx_documentos_seguimiento_fecha
  ON documentos_seguimiento(fecha DESC);

-- RLS: lectura abierta a usuarios autenticados, escritura solo desde el
-- backend con service_role (mismo patrón que el resto de las tablas del ERP).
ALTER TABLE documentos_seguimiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_seguimiento_select_authenticated" ON documentos_seguimiento;
CREATE POLICY "documentos_seguimiento_select_authenticated"
  ON documentos_seguimiento
  FOR SELECT
  TO authenticated
  USING (true);

SELECT 'OK - tabla documentos_seguimiento creada' AS resultado;
