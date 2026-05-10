-- ============================================================
-- 115 · Sync de cuentas contables: diario bancario → caja_valor
--
-- Cuando se actualiza la cuenta_debito o cuenta_haber predeterminadas
-- de un diario bancario en /contabilidad/diarios, los caja_valores
-- linkados (vía caja_bancos_permitidos.codigo == diario.codigo) deben
-- actualizar sus cuentas también.
--
-- Sin esto, el admin tiene que correr SQL manualmente cada vez que
-- cambia la cuenta del banco. Con el trigger es automático.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_sync_cuentas_diario_a_caja_valor()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Solo aplicar si cambió alguna de las cuentas y es un diario bancario.
  IF NEW.tipo = 'banco_cheques'
     AND (
       OLD.cuenta_debito_predeterminada_id IS DISTINCT FROM NEW.cuenta_debito_predeterminada_id
       OR OLD.cuenta_haber_predeterminada_id IS DISTINCT FROM NEW.cuenta_haber_predeterminada_id
     )
  THEN
    -- Propagar a los caja_valores que tienen un banco_permitido con el
    -- mismo código que este diario.
    UPDATE public.caja_valores cv
       SET cuenta_contable_id = NEW.cuenta_debito_predeterminada_id,
           cuenta_haber_id    = NEW.cuenta_haber_predeterminada_id
      FROM public.caja_bancos_permitidos bp
     WHERE cv.banco_permitido_id = bp.id
       AND bp.codigo = NEW.codigo;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cuentas_diario_a_caja_valor ON public.contabilidad_diarios;
CREATE TRIGGER trg_sync_cuentas_diario_a_caja_valor
AFTER UPDATE OF cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id
ON public.contabilidad_diarios
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_cuentas_diario_a_caja_valor();

NOTIFY pgrst, 'reload schema';
