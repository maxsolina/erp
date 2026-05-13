-- ============================================================
-- 121 · Seed cuentas predeterminadas para diarios de bancos
--
-- Cuando se crea una cuenta bancaria, el trigger del script 014
-- genera un diario automático pero SIN cuenta_debito/cuenta_haber
-- predeterminadas. Esto rompe la generación de asientos en
-- depósitos, extracciones y transferencias bancarias.
--
-- Este script matchea cada diario bancario con la cuenta contable
-- del plan por el nombre del banco. Es idempotente: solo actualiza
-- diarios que no tengan cuentas ya configuradas.
-- ============================================================

-- Banco Galicia (todas las variantes "galicia")
UPDATE public.contabilidad_diarios d
   SET cuenta_debito_predeterminada_id = pc.id,
       cuenta_haber_predeterminada_id  = pc.id
  FROM public.cuentas_bancarias cb,
       public.contabilidad_plan_cuentas pc
 WHERE d.cuenta_bancaria_id = cb.id
   AND LOWER(cb.banco_nombre) LIKE '%galicia%'
   AND LOWER(pc.nombre)       LIKE '%galicia%'
   AND pc.activo = true
   AND d.cuenta_debito_predeterminada_id IS NULL
   AND d.cuenta_haber_predeterminada_id  IS NULL;

-- Banco Nación ARS (excluye USD)
UPDATE public.contabilidad_diarios d
   SET cuenta_debito_predeterminada_id = pc.id,
       cuenta_haber_predeterminada_id  = pc.id
  FROM public.cuentas_bancarias cb,
       public.contabilidad_plan_cuentas pc
 WHERE d.cuenta_bancaria_id = cb.id
   AND LOWER(cb.banco_nombre) LIKE '%naci%n%'
   AND cb.moneda = 'ARS'
   AND LOWER(pc.nombre) LIKE '%naci%n%'
   AND LOWER(pc.nombre) NOT LIKE '%usd%'
   AND pc.activo = true
   AND d.cuenta_debito_predeterminada_id IS NULL
   AND d.cuenta_haber_predeterminada_id  IS NULL;

-- Banco Nación USD
UPDATE public.contabilidad_diarios d
   SET cuenta_debito_predeterminada_id = pc.id,
       cuenta_haber_predeterminada_id  = pc.id
  FROM public.cuentas_bancarias cb,
       public.contabilidad_plan_cuentas pc
 WHERE d.cuenta_bancaria_id = cb.id
   AND LOWER(cb.banco_nombre) LIKE '%naci%n%'
   AND cb.moneda = 'USD'
   AND LOWER(pc.nombre) LIKE '%naci%n%usd%'
   AND pc.activo = true
   AND d.cuenta_debito_predeterminada_id IS NULL
   AND d.cuenta_haber_predeterminada_id  IS NULL;

-- Verificación
SELECT
  cb.banco_nombre,
  cb.numero_cuenta,
  cb.moneda,
  d.codigo AS diario_codigo,
  cd.codigo || ' - ' || cd.nombre AS cuenta_predeterminada
FROM public.contabilidad_diarios d
LEFT JOIN public.cuentas_bancarias cb ON cb.id = d.cuenta_bancaria_id
LEFT JOIN public.contabilidad_plan_cuentas cd ON cd.id = d.cuenta_debito_predeterminada_id
WHERE d.cuenta_bancaria_id IS NOT NULL
ORDER BY cb.banco_nombre;
