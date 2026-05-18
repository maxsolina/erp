-- ============================================================
-- 133 · Numeración secuencial para NC y ND de Compra
--
-- Hasta hoy el form mandaba `NC-{Date.now()}` como número provisorio
-- (13 dígitos del timestamp = horrible). Reemplazo por secuencia limpia
-- tipo `NC-2026-0001`, mismo patrón que OP.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS compras_nc_seq START 1;
CREATE SEQUENCE IF NOT EXISTS compras_nd_seq START 1;

CREATE OR REPLACE FUNCTION generar_numero_nc_compra()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_numero INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_numero := nextval('compras_nc_seq');
  RETURN 'NC-' || v_year || '-' || LPAD(v_numero::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generar_numero_nd_compra()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_numero INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_numero := nextval('compras_nd_seq');
  RETURN 'ND-' || v_year || '-' || LPAD(v_numero::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
