-- 047: Desactivar moneda EUR de contabilidad_monedas
-- Idempotente: solo actualiza si activo = true
UPDATE contabilidad_monedas
SET activo = FALSE
WHERE codigo = 'EUR'
  AND activo = TRUE;
