-- 054b: Corregir políticas RLS de conciliaciones_deuda
-- Las políticas originales usaban TO authenticated, bloqueando al cliente anon.
-- Se reemplazan por el patrón estándar del proyecto: FOR ALL USING (true).

-- ─── conciliaciones_deuda ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "conciliaciones_deuda_auth"       ON public.conciliaciones_deuda;
DROP POLICY IF EXISTS "allow_all_conciliaciones_deuda"  ON public.conciliaciones_deuda;

CREATE POLICY "allow_all_conciliaciones_deuda"
  ON public.conciliaciones_deuda
  FOR ALL USING (true) WITH CHECK (true);

-- ─── conciliaciones_deuda_aplicaciones ───────────────────────────────────────
DROP POLICY IF EXISTS "conciliaciones_deuda_apl_auth"      ON public.conciliaciones_deuda_aplicaciones;
DROP POLICY IF EXISTS "allow_all_conciliaciones_deuda_apl" ON public.conciliaciones_deuda_aplicaciones;

CREATE POLICY "allow_all_conciliaciones_deuda_apl"
  ON public.conciliaciones_deuda_aplicaciones
  FOR ALL USING (true) WITH CHECK (true);
