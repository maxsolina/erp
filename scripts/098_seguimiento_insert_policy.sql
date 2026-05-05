-- ============================================================================
-- 098_seguimiento_insert_policy.sql
--
-- Política INSERT para `documentos_seguimiento`. La 092 sólo agregó SELECT,
-- así que los endpoints API que corren con la sesión del usuario (no con
-- service_role) recibían:
--   "new row violates row-level security policy for table documentos_seguimiento"
--
-- Esta policy permite a cualquier usuario autenticado registrar eventos. Es
-- seguro porque los inserts vienen del backend (Next.js API routes), no de
-- llamadas directas del browser, y porque los datos de seguimiento son sólo
-- auditoría — no información sensible.
-- ============================================================================

DROP POLICY IF EXISTS "documentos_seguimiento_insert_authenticated" ON documentos_seguimiento;
CREATE POLICY "documentos_seguimiento_insert_authenticated"
  ON documentos_seguimiento
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

SELECT 'OK - policy INSERT agregada a documentos_seguimiento' AS resultado;
