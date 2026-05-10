-- ============================================================
-- 111 · Asignación de usuarios a Diarios y a Caja Valores
--
-- Reglas de visibilidad (Opción A acordada con el usuario):
--   • Un Diario lo ve quien esté asignado a él (o superuser).
--   • Una Caja la ve quien esté asignado a AL MENOS UN caja_valor de
--     esa caja (o superuser). Esto da control fino: un cobrador puede
--     manejar el "Efectivo" de una caja sin tener acceso a los "Cheques".
--   • Un caja_valor lo ve quien esté asignado a ese valor específico.
--
-- Cambios:
--   1) `contabilidad_diarios_usuarios.usuario_id` ahora es INTEGER con FK
--      a `usuarios(id)` — antes era UUID sin FK (bug — `usuarios.id` es
--      SERIAL/INTEGER). La tabla está vacía así que se puede recrear.
--   2) Nueva tabla `caja_valores_usuarios`.
--   3) RLS para filtrar lecturas según asignaciones (defensa por DB).
-- ============================================================

-- ─── 1. Reemplazar contabilidad_diarios_usuarios ────────────
DROP TABLE IF EXISTS public.contabilidad_diarios_usuarios CASCADE;

CREATE TABLE public.contabilidad_diarios_usuarios (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  diario_id    UUID         NOT NULL REFERENCES public.contabilidad_diarios(id) ON DELETE CASCADE,
  usuario_id   INTEGER      NOT NULL REFERENCES public.usuarios(id)              ON DELETE CASCADE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (diario_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_diarios_usuarios_diario  ON public.contabilidad_diarios_usuarios(diario_id);
CREATE INDEX IF NOT EXISTS idx_diarios_usuarios_usuario ON public.contabilidad_diarios_usuarios(usuario_id);


-- ─── 2. caja_valores_usuarios (nueva) ───────────────────────
CREATE TABLE IF NOT EXISTS public.caja_valores_usuarios (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_valor_id   UUID         NOT NULL REFERENCES public.caja_valores(id) ON DELETE CASCADE,
  usuario_id      INTEGER      NOT NULL REFERENCES public.usuarios(id)     ON DELETE CASCADE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (caja_valor_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_cv_usuarios_caja_valor ON public.caja_valores_usuarios(caja_valor_id);
CREATE INDEX IF NOT EXISTS idx_cv_usuarios_usuario    ON public.caja_valores_usuarios(usuario_id);


-- ─── 3. Helpers SECURITY DEFINER para RLS ───────────────────
-- Bypassean RLS para resolver "¿el usuario logueado puede ver X?" sin
-- recursión (las tablas que consultan también tienen RLS).

CREATE OR REPLACE FUNCTION public.fn_usuario_id_actual()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_es_superuser_actual()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE auth_user_id = auth.uid()
      AND is_superuser = TRUE
      AND is_active = TRUE
  );
$$;

-- Diarios visibles para el usuario logueado (los que tiene asignados).
CREATE OR REPLACE FUNCTION public.fn_mis_diarios_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT diario_id FROM public.contabilidad_diarios_usuarios
  WHERE usuario_id = public.fn_usuario_id_actual();
$$;

-- caja_valores que el usuario logueado tiene asignados.
CREATE OR REPLACE FUNCTION public.fn_mis_caja_valores_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT caja_valor_id FROM public.caja_valores_usuarios
  WHERE usuario_id = public.fn_usuario_id_actual();
$$;

-- Cajas visibles: todas las que tengan al menos un caja_valor asignado al user.
CREATE OR REPLACE FUNCTION public.fn_mis_cajas_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT cv.caja_id
  FROM public.caja_valores cv
  WHERE cv.id IN (SELECT public.fn_mis_caja_valores_ids());
$$;


-- ─── 4. RLS en las 3 tablas operativas ──────────────────────
-- contabilidad_diarios
ALTER TABLE public.contabilidad_diarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diarios_select_asignados ON public.contabilidad_diarios;
CREATE POLICY diarios_select_asignados ON public.contabilidad_diarios
FOR SELECT USING (
  public.fn_es_superuser_actual()
  OR id IN (SELECT public.fn_mis_diarios_ids())
);
-- INSERT/UPDATE/DELETE: solo superuser
DROP POLICY IF EXISTS diarios_modify_admin ON public.contabilidad_diarios;
CREATE POLICY diarios_modify_admin ON public.contabilidad_diarios
FOR ALL USING (public.fn_es_superuser_actual())
WITH CHECK (public.fn_es_superuser_actual());

-- cajas
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cajas_select_asignadas ON public.cajas;
CREATE POLICY cajas_select_asignadas ON public.cajas
FOR SELECT USING (
  public.fn_es_superuser_actual()
  OR id IN (SELECT public.fn_mis_cajas_ids())
);
DROP POLICY IF EXISTS cajas_modify_admin ON public.cajas;
CREATE POLICY cajas_modify_admin ON public.cajas
FOR ALL USING (public.fn_es_superuser_actual())
WITH CHECK (public.fn_es_superuser_actual());

-- caja_valores
ALTER TABLE public.caja_valores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS caja_valores_select_asignados ON public.caja_valores;
CREATE POLICY caja_valores_select_asignados ON public.caja_valores
FOR SELECT USING (
  public.fn_es_superuser_actual()
  OR id IN (SELECT public.fn_mis_caja_valores_ids())
);
DROP POLICY IF EXISTS caja_valores_modify_admin ON public.caja_valores;
CREATE POLICY caja_valores_modify_admin ON public.caja_valores
FOR ALL USING (public.fn_es_superuser_actual())
WITH CHECK (public.fn_es_superuser_actual());


-- ─── 5. RLS en las tablas de asignación ─────────────────────
-- Cualquiera puede leer SUS asignaciones; solo superuser modifica.
ALTER TABLE public.contabilidad_diarios_usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diarios_usuarios_select ON public.contabilidad_diarios_usuarios;
CREATE POLICY diarios_usuarios_select ON public.contabilidad_diarios_usuarios
FOR SELECT USING (
  public.fn_es_superuser_actual()
  OR usuario_id = public.fn_usuario_id_actual()
);
DROP POLICY IF EXISTS diarios_usuarios_modify ON public.contabilidad_diarios_usuarios;
CREATE POLICY diarios_usuarios_modify ON public.contabilidad_diarios_usuarios
FOR ALL USING (public.fn_es_superuser_actual())
WITH CHECK (public.fn_es_superuser_actual());

ALTER TABLE public.caja_valores_usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cv_usuarios_select ON public.caja_valores_usuarios;
CREATE POLICY cv_usuarios_select ON public.caja_valores_usuarios
FOR SELECT USING (
  public.fn_es_superuser_actual()
  OR usuario_id = public.fn_usuario_id_actual()
);
DROP POLICY IF EXISTS cv_usuarios_modify ON public.caja_valores_usuarios;
CREATE POLICY cv_usuarios_modify ON public.caja_valores_usuarios
FOR ALL USING (public.fn_es_superuser_actual())
WITH CHECK (public.fn_es_superuser_actual());


-- ─── 6. Refresh schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';
