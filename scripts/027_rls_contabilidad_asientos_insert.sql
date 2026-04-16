-- Permite a usuarios autenticados insertar y actualizar asientos contables.
-- Los asientos automáticos se generan desde API routes con sesión de usuario.

-- contabilidad_asientos
DROP POLICY IF EXISTS "contabilidad_asientos_insert" ON contabilidad_asientos;
CREATE POLICY "contabilidad_asientos_insert"
  ON contabilidad_asientos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contabilidad_asientos_update" ON contabilidad_asientos;
CREATE POLICY "contabilidad_asientos_update"
  ON contabilidad_asientos FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "contabilidad_asientos_delete" ON contabilidad_asientos;
CREATE POLICY "contabilidad_asientos_delete"
  ON contabilidad_asientos FOR DELETE
  TO authenticated
  USING (true);

-- contabilidad_asientos_lineas
DROP POLICY IF EXISTS "contabilidad_asientos_lineas_insert" ON contabilidad_asientos_lineas;
CREATE POLICY "contabilidad_asientos_lineas_insert"
  ON contabilidad_asientos_lineas FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contabilidad_asientos_lineas_update" ON contabilidad_asientos_lineas;
CREATE POLICY "contabilidad_asientos_lineas_update"
  ON contabilidad_asientos_lineas FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "contabilidad_asientos_lineas_delete" ON contabilidad_asientos_lineas;
CREATE POLICY "contabilidad_asientos_lineas_delete"
  ON contabilidad_asientos_lineas FOR DELETE
  TO authenticated
  USING (true);
