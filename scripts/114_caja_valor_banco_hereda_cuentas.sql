-- ============================================================
-- 114 · El caja_valor auto-generado hereda las cuentas contables
--       del diario bancario subyacente
--
-- Bug: el trigger del 113 creaba el caja_valor sin cuenta_contable_id
-- ni cuenta_haber_id. Resultado: al confirmar un recibo con ese banco,
-- el factory de asientos tira "no tiene cuenta contable asignada".
--
-- Fix: el trigger ahora hace LOOKUP del diario bancario via `codigo`
-- (los diarios automáticos del 014 usan código BCO-XXX que matchea
-- con caja_bancos_permitidos.codigo) y copia las cuentas predeterminadas.
--
-- Backfill: para caja_valores ya creados sin cuentas, los actualizamos
-- también.
-- ============================================================

-- ─── 1. Reescribir el trigger AFTER INSERT ──────────────────
CREATE OR REPLACE FUNCTION public.fn_crear_caja_valor_banco_permitido()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_codigo            TEXT;
  v_cuenta_debito_id  UUID;
  v_cuenta_haber_id   UUID;
BEGIN
  v_codigo := 'BAN-' || UPPER(LEFT(NEW.id::text, 8));

  -- Buscar las cuentas contables del diario bancario que matchea por código.
  -- Si no existe (caso raro), las cuentas quedan en NULL — el operador va
  -- a tener que setearlas manualmente en /contabilidad/diarios.
  SELECT cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id
    INTO v_cuenta_debito_id, v_cuenta_haber_id
    FROM public.contabilidad_diarios
   WHERE codigo = NEW.codigo
     AND tipo = 'banco_cheques'
   LIMIT 1;

  INSERT INTO public.caja_valores
    (caja_id, nombre, codigo, tipo, subtipo, moneda, activo, banco_permitido_id,
     cuenta_contable_id, cuenta_haber_id)
  VALUES (
    NEW.caja_id,
    NEW.banco_nombre,
    v_codigo,
    'banco_cheques',
    'banco',
    COALESCE(NEW.moneda, 'ARS'),
    true,
    NEW.id,
    v_cuenta_debito_id,
    v_cuenta_haber_id
  )
  ON CONFLICT (codigo) DO NOTHING;

  RETURN NEW;
END;
$$;


-- ─── 2. Backfill cuentas en caja_valores existentes ─────────
-- Para los rows ya creados antes de este script (el caja_valor existe
-- pero sin cuenta_contable_id porque el trigger del 113 no las copiaba).
UPDATE public.caja_valores cv
   SET cuenta_contable_id = COALESCE(cv.cuenta_contable_id, d.cuenta_debito_predeterminada_id),
       cuenta_haber_id    = COALESCE(cv.cuenta_haber_id,    d.cuenta_haber_predeterminada_id)
  FROM public.caja_bancos_permitidos bp
  JOIN public.contabilidad_diarios d
    ON d.codigo = bp.codigo
   AND d.tipo = 'banco_cheques'
 WHERE cv.banco_permitido_id = bp.id
   AND (cv.cuenta_contable_id IS NULL OR cv.cuenta_haber_id IS NULL);


-- ─── 3. Refresh schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';
