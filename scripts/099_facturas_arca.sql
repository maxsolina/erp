-- ============================================================================
-- 099_facturas_arca.sql
--
-- Agrega columnas para el control de Facturaciones ARCA (AFIP) en la tabla
-- `facturas`. Cada factura con IVA generada en el ERP queda pendiente de
-- facturarse externamente vía el facturador masivo de ARCA. El operador entra
-- a Contabilidad → Operaciones → Facturaciones, ve el listado de pendientes,
-- exporta a Excel para ARCA, y luego tilda las que ya subió.
-- ============================================================================

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS arca_facturada       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS arca_facturada_at    TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS arca_facturada_por   TEXT        NULL;

CREATE INDEX IF NOT EXISTS idx_facturas_arca_pendientes
  ON facturas(arca_facturada)
  WHERE arca_facturada = FALSE;

SELECT 'OK - columnas arca_* agregadas a facturas' AS resultado;
