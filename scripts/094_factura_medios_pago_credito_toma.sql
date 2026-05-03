-- ============================================================================
-- 094_factura_medios_pago_credito_toma.sql
-- FAC-11: agrega soporte para medio de pago "credito_toma" en facturas.
--
-- Cuando un cliente trae un equipo en parte de pago, se genera una NC
-- (ajustes_clientes con categoria='Equipos en parte de pago'). Al confirmar
-- una factura siguiente, el operador ve esa NC pre-cargada como medio de pago
-- y al confirmar se descuenta automáticamente del saldo_disponible de la NC.
--
-- Cambios:
--   1. Ampliar el CHECK de `medio` para aceptar 'credito_toma'
--   2. Agregar columna `nc_id` (FK a ajustes_clientes) para referenciar la NC
--   3. Actualizar constraints de iva/recargo para que credito_toma se trate
--      como efectivo (sin IVA, sin recargo)
--
-- IDEMPOTENTE
-- ============================================================================

-- 1. Drop+recreate del CHECK de medio para incluir credito_toma
ALTER TABLE public.factura_medios_pago
  DROP CONSTRAINT IF EXISTS factura_medios_pago_medio_check;

ALTER TABLE public.factura_medios_pago
  ADD CONSTRAINT factura_medios_pago_medio_check
  CHECK (medio IN ('efectivo', 'transferencia', 'tarjeta', 'credito_toma'));

-- 2. Columna nc_id (FK a ajustes_clientes) — opcional, solo para credito_toma
ALTER TABLE public.factura_medios_pago
  ADD COLUMN IF NOT EXISTS nc_id INTEGER REFERENCES public.ajustes_clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS factura_medios_pago_nc_id_idx
  ON public.factura_medios_pago(nc_id)
  WHERE nc_id IS NOT NULL;

-- 3. Actualizar constraint de IVA: efectivo Y credito_toma NO tienen IVA
ALTER TABLE public.factura_medios_pago
  DROP CONSTRAINT IF EXISTS factura_medios_pago_iva_efectivo;

ALTER TABLE public.factura_medios_pago
  ADD CONSTRAINT factura_medios_pago_iva_no_facturable
  CHECK (medio NOT IN ('efectivo', 'credito_toma') OR iva_calculado = 0);

-- 4. Actualizar constraint de recargo: solo tarjeta tiene recargo
-- (ya estaba bien, pero por idempotencia lo dropeo y recreo)
ALTER TABLE public.factura_medios_pago
  DROP CONSTRAINT IF EXISTS factura_medios_pago_recargo_solo_tarjeta;

ALTER TABLE public.factura_medios_pago
  ADD CONSTRAINT factura_medios_pago_recargo_solo_tarjeta
  CHECK (medio = 'tarjeta' OR recargo = 0);

-- 5. Constraint nuevo: si medio = 'credito_toma' debe tener nc_id
ALTER TABLE public.factura_medios_pago
  DROP CONSTRAINT IF EXISTS factura_medios_pago_credito_toma_nc;

ALTER TABLE public.factura_medios_pago
  ADD CONSTRAINT factura_medios_pago_credito_toma_nc
  CHECK (medio <> 'credito_toma' OR nc_id IS NOT NULL);

SELECT 'OK - factura_medios_pago ahora soporta credito_toma' AS resultado;
