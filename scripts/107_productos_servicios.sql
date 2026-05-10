-- ============================================================
-- 107 · Soporte para productos tipo "servicio"
--
-- El campo `productos.tipo` ya existe (CHECK 'almacenable' /
-- 'servicio' / 'consumible') desde el script 001. Este script:
--
--   1) Crea la cuenta contable "Ingresos por Servicios" en el
--      plan de cuentas (si no existe).
--   2) Agrega un mapeo en contabilidad_mapeo_cuentas con
--      tipo_origen='factura_venta' subtipo='ingresos_servicios'
--      apuntando a esa cuenta — el asiento de factura usará
--      ESTE mapeo cuando la factura tiene líneas de servicio,
--      sumando al HABER aparte del Ventas Mercadería habitual.
--
-- Servicios:
--   - No tienen stock ni descarga de existencias al remitir.
--   - No aparecen en OC, Recepción, Ajustes, Transferencias,
--     Remitos.
--   - Sí aparecen en NV, Factura venta, NC, ND, OT y listas
--     de precios.
--   - El asiento de venta los manda a "Ingresos por Servicios"
--     en lugar de "Ventas Mercadería".
-- ============================================================

-- ─── 1. Cuenta "Ingresos por Servicios" (si no existe) ──────
DO $$
DECLARE
  v_padre_id UUID;
  v_existe   UUID;
BEGIN
  -- Buscamos por código exacto primero
  SELECT id INTO v_existe
  FROM public.contabilidad_plan_cuentas
  WHERE codigo = '41010102'
  LIMIT 1;

  IF v_existe IS NULL THEN
    -- Padre: la cuenta de Ventas Mercadería (41010101) suele estar bajo
    -- "Ventas" — buscamos un padre razonable, sino la dejamos sin padre.
    SELECT cuenta_padre_id INTO v_padre_id
    FROM public.contabilidad_plan_cuentas
    WHERE codigo = '41010101'
    LIMIT 1;

    INSERT INTO public.contabilidad_plan_cuentas
      (codigo, nombre, tipo, naturaleza, cuenta_padre_id, activa, es_imputable)
    VALUES
      ('41010102', 'Ingresos por Servicios', 'ingreso', 'haber', v_padre_id, true, true);
  END IF;
END $$;

-- ─── 2. Mapeo factura_venta + subtipo ingresos_servicios ────
-- Si existía un mapeo previo lo dejamos. Si no, lo creamos.
DO $$
DECLARE
  v_cuenta_serv_id UUID;
  v_diario_id      UUID;
  v_existe         UUID;
BEGIN
  SELECT id INTO v_cuenta_serv_id
  FROM public.contabilidad_plan_cuentas
  WHERE codigo = '41010102'
  LIMIT 1;

  -- Diario: el mismo que usa el resto de factura_venta (subtipo='ventas')
  SELECT diario_id INTO v_diario_id
  FROM public.contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_venta' AND subtipo = 'ventas'
  LIMIT 1;

  -- ¿Ya existe el mapeo?
  SELECT id INTO v_existe
  FROM public.contabilidad_mapeo_cuentas
  WHERE tipo_origen = 'factura_venta' AND subtipo = 'ingresos_servicios'
  LIMIT 1;

  IF v_existe IS NULL AND v_cuenta_serv_id IS NOT NULL AND v_diario_id IS NOT NULL THEN
    INSERT INTO public.contabilidad_mapeo_cuentas
      (nombre, tipo_origen, subtipo, cuenta_haber_id, diario_id, activo)
    VALUES
      ('Factura Venta — Ingresos por Servicios', 'factura_venta', 'ingresos_servicios', v_cuenta_serv_id, v_diario_id, true);
  END IF;
END $$;

-- ─── 3. Refresh schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';
