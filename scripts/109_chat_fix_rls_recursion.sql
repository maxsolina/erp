-- ============================================================
-- 109 · Fix recursión RLS en chat_participantes
--
-- El script 108 dejó policies en chat_participantes que queryaban
-- chat_participantes desde adentro → infinite recursion al hacer SELECT.
-- También chat_part_insert verificaba "soy admin de la conv" mirando
-- chat_participantes (recursivo Y broken al crear: las filas todavía
-- no existen).
--
-- Fix:
--   1) Función SECURITY DEFINER `chat_mis_conversaciones()` que devuelve
--      las conv ids del usuario logueado SIN pasar por RLS — todas las
--      policies que necesitan saber "¿soy participante de X?" la usan.
--   2) chat_part_insert: relajar a "soy creador de la conv" (mirando
--      chat_conversaciones, no chat_participantes) → no recursión Y
--      funciona en el flow de creación de chat.
-- ============================================================

-- ─── 1. Helper que bypasea RLS ──────────────────────────────
CREATE OR REPLACE FUNCTION chat_mis_conversaciones()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT conversacion_id FROM chat_participantes
  WHERE usuario_id = chat_usuario_id()
    AND archivado_at IS NULL;
$$;

-- ─── 2. Reescribir SELECT policies usando la función ────────
DROP POLICY IF EXISTS chat_part_select ON chat_participantes;
CREATE POLICY chat_part_select ON chat_participantes
FOR SELECT USING (
  chat_es_superuser()
  OR conversacion_id IN (SELECT chat_mis_conversaciones())
);

DROP POLICY IF EXISTS chat_conv_select ON chat_conversaciones;
CREATE POLICY chat_conv_select ON chat_conversaciones
FOR SELECT USING (
  chat_es_superuser()
  OR id IN (SELECT chat_mis_conversaciones())
);

DROP POLICY IF EXISTS chat_msg_select ON chat_mensajes;
CREATE POLICY chat_msg_select ON chat_mensajes
FOR SELECT USING (
  chat_es_superuser()
  OR conversacion_id IN (SELECT chat_mis_conversaciones())
);

-- ─── 3. INSERT policies: usar la función o tabla conversaciones ─
DROP POLICY IF EXISTS chat_msg_insert ON chat_mensajes;
CREATE POLICY chat_msg_insert ON chat_mensajes
FOR INSERT WITH CHECK (
  remitente_id = chat_usuario_id()
  AND conversacion_id IN (SELECT chat_mis_conversaciones())
);

-- chat_part_insert: el caso típico es "creo una conv y la lleno con
-- participantes" — los rows NO existen al momento del check. Tampoco
-- podemos hacer EXISTS sobre chat_participantes (recursión). Solución:
-- mirar `chat_conversaciones.creado_por_id` que SÍ existe en ese momento.
DROP POLICY IF EXISTS chat_part_insert ON chat_participantes;
CREATE POLICY chat_part_insert ON chat_participantes
FOR INSERT WITH CHECK (
  chat_es_superuser()
  -- agregarse a sí mismo (caso muy raro fuera de la creación)
  OR usuario_id = chat_usuario_id()
  -- creador de la conv puede agregar a cualquiera
  OR EXISTS (
    SELECT 1 FROM chat_conversaciones c
    WHERE c.id = chat_participantes.conversacion_id
      AND c.creado_por_id = chat_usuario_id()
  )
);

-- ─── 4. Refresh schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';
