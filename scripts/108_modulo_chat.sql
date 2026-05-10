-- ============================================================
-- 108 · Módulo de Mensajería interna (chat tipo WhatsApp)
--
-- Objetivo: que los empleados se comuniquen DENTRO del ERP en
-- lugar de usar WhatsApp personal. El admin (is_superuser=true)
-- puede ver todas las conversaciones — esto es transparente para
-- los empleados (banner en el UI).
--
-- 3 tablas:
--   chat_conversaciones  — sala (1-a-1 o grupo)
--   chat_participantes   — quién está en cada sala (con last_read_at)
--   chat_mensajes        — los mensajes en sí
--
-- Realtime: las tablas se publican en supabase_realtime para que
-- el frontend reciba mensajes nuevos sin polling.
--
-- RLS: cada usuario solo ve sus conversaciones; superusers ven todo.
-- ============================================================

-- ─── 1. Conversaciones ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversaciones (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            TEXT         NOT NULL CHECK (tipo IN ('directo', 'grupo')),
  -- Solo aplica a grupos. En 1-a-1 se renderiza con el nombre del otro participante.
  nombre          TEXT,
  imagen_url      TEXT,
  creado_por_id   INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  -- Timestamp del último mensaje — denormalizado para ordenar la lista
  -- de chats sin tener que joinear cada vez con chat_mensajes.
  ultimo_mensaje_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_ultimo_mensaje ON chat_conversaciones(ultimo_mensaje_at DESC);


-- ─── 2. Participantes ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_participantes (
  id              BIGSERIAL    PRIMARY KEY,
  conversacion_id UUID         NOT NULL REFERENCES chat_conversaciones(id) ON DELETE CASCADE,
  usuario_id      INTEGER      NOT NULL REFERENCES usuarios(id)             ON DELETE CASCADE,
  -- Rol dentro de la conversación. En grupos el creador es 'admin' y
  -- puede agregar/sacar gente; en 1-a-1 ambos son 'miembro'.
  rol             TEXT         NOT NULL DEFAULT 'miembro' CHECK (rol IN ('admin', 'miembro')),
  -- Timestamp del último mensaje que el usuario marcó como leído.
  -- Mensajes con created_at > last_read_at = no leídos.
  last_read_at    TIMESTAMPTZ,
  -- Para "salir del grupo" sin perder histórico: se setea aquí y
  -- el usuario deja de ver mensajes nuevos (los viejos siguen visibles).
  archivado_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (conversacion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_part_usuario ON chat_participantes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chat_part_conv    ON chat_participantes(conversacion_id);


-- ─── 3. Mensajes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_mensajes (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id UUID         NOT NULL REFERENCES chat_conversaciones(id) ON DELETE CASCADE,
  remitente_id    INTEGER      NOT NULL REFERENCES usuarios(id),
  -- 'texto' es el caso base; 'imagen' / 'archivo' usan adjunto_url;
  -- 'sistema' es para mensajes auto-generados (ej: "X agregó a Y al grupo").
  tipo            TEXT         NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagen', 'archivo', 'sistema')),
  contenido       TEXT,
  adjunto_url     TEXT,
  adjunto_nombre  TEXT,
  adjunto_tamaño  BIGINT,
  -- Replies: enlazamos al mensaje original (preparado para v2).
  reply_to_id     UUID         REFERENCES chat_mensajes(id) ON DELETE SET NULL,
  editado_at      TIMESTAMPTZ,
  -- Soft delete — mantener registro para auditoría aunque el usuario
  -- borre el mensaje "para todos". El UI muestra "Mensaje eliminado".
  eliminado_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Trae los mensajes de una conversación ordenados por fecha (uso típico).
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_fecha ON chat_mensajes(conversacion_id, created_at DESC);

-- pg_trgm habilita búsqueda fuzzy / contains acelerada. Lo activamos antes
-- del índice GIN — Supabase ya lo trae instalado por defecto, pero por las
-- dudas (ambientes locales) lo creamos idempotentemente.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Para búsqueda de texto. Si la base se hace muy grande conviene migrar a tsvector.
CREATE INDEX IF NOT EXISTS idx_chat_msg_contenido_trgm ON chat_mensajes USING gin (contenido gin_trgm_ops);


-- ─── 4. Trigger: cuando se inserta un mensaje, actualizar
-- ultimo_mensaje_at en la conversación (para ordenar la lista).
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION chat_actualizar_ultimo_mensaje()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversaciones
     SET ultimo_mensaje_at = NEW.created_at,
         updated_at        = NEW.created_at
   WHERE id = NEW.conversacion_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_msg_ultimo ON chat_mensajes;
CREATE TRIGGER trg_chat_msg_ultimo
AFTER INSERT ON chat_mensajes
FOR EACH ROW
EXECUTE FUNCTION chat_actualizar_ultimo_mensaje();


-- ─── 5. RLS ─────────────────────────────────────────────────
-- Reglas:
--   • Un usuario ve una conversación SI es participante (no archivado).
--   • Un superuser ve TODAS las conversaciones — pero no puede mandar
--     mensajes en convos donde no participa (sin disfrazarse de empleado).
--   • Los mensajes solo se leen si el usuario ve la conversación.
--   • Solo el remitente puede editar/borrar sus propios mensajes.
-- ────────────────────────────────────────────────────────────

ALTER TABLE chat_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensajes       ENABLE ROW LEVEL SECURITY;

-- Helper: ¿el auth.uid() es superuser?
CREATE OR REPLACE FUNCTION chat_es_superuser()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE auth_user_id = auth.uid()
      AND is_superuser = TRUE
      AND is_active = TRUE
  );
$$;

-- Helper: id del usuario logueado
CREATE OR REPLACE FUNCTION chat_usuario_id()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ── Conversaciones
DROP POLICY IF EXISTS chat_conv_select ON chat_conversaciones;
CREATE POLICY chat_conv_select ON chat_conversaciones
FOR SELECT USING (
  chat_es_superuser()
  OR EXISTS (
    SELECT 1 FROM chat_participantes p
    WHERE p.conversacion_id = chat_conversaciones.id
      AND p.usuario_id = chat_usuario_id()
  )
);

DROP POLICY IF EXISTS chat_conv_insert ON chat_conversaciones;
CREATE POLICY chat_conv_insert ON chat_conversaciones
FOR INSERT WITH CHECK (creado_por_id = chat_usuario_id() OR chat_es_superuser());

DROP POLICY IF EXISTS chat_conv_update ON chat_conversaciones;
CREATE POLICY chat_conv_update ON chat_conversaciones
FOR UPDATE USING (
  chat_es_superuser()
  OR EXISTS (
    SELECT 1 FROM chat_participantes p
    WHERE p.conversacion_id = chat_conversaciones.id
      AND p.usuario_id = chat_usuario_id()
      AND p.rol = 'admin'
  )
);

-- ── Participantes
DROP POLICY IF EXISTS chat_part_select ON chat_participantes;
CREATE POLICY chat_part_select ON chat_participantes
FOR SELECT USING (
  chat_es_superuser()
  OR conversacion_id IN (
    SELECT conversacion_id FROM chat_participantes
    WHERE usuario_id = chat_usuario_id()
  )
);

DROP POLICY IF EXISTS chat_part_insert ON chat_participantes;
CREATE POLICY chat_part_insert ON chat_participantes
FOR INSERT WITH CHECK (
  chat_es_superuser()
  OR usuario_id = chat_usuario_id()  -- agregarse a sí mismo
  OR EXISTS (
    SELECT 1 FROM chat_participantes p
    WHERE p.conversacion_id = chat_participantes.conversacion_id
      AND p.usuario_id = chat_usuario_id()
      AND p.rol = 'admin'
  )
);

DROP POLICY IF EXISTS chat_part_update ON chat_participantes;
CREATE POLICY chat_part_update ON chat_participantes
FOR UPDATE USING (
  -- Cada uno actualiza su propio last_read_at / archivado_at
  usuario_id = chat_usuario_id()
  OR chat_es_superuser()
);

-- ── Mensajes
DROP POLICY IF EXISTS chat_msg_select ON chat_mensajes;
CREATE POLICY chat_msg_select ON chat_mensajes
FOR SELECT USING (
  chat_es_superuser()
  OR conversacion_id IN (
    SELECT conversacion_id FROM chat_participantes
    WHERE usuario_id = chat_usuario_id()
  )
);

DROP POLICY IF EXISTS chat_msg_insert ON chat_mensajes;
CREATE POLICY chat_msg_insert ON chat_mensajes
FOR INSERT WITH CHECK (
  -- El remitente debe ser el usuario logueado y ser participante de la conv.
  remitente_id = chat_usuario_id()
  AND EXISTS (
    SELECT 1 FROM chat_participantes p
    WHERE p.conversacion_id = chat_mensajes.conversacion_id
      AND p.usuario_id = chat_usuario_id()
      AND p.archivado_at IS NULL
  )
);

DROP POLICY IF EXISTS chat_msg_update ON chat_mensajes;
CREATE POLICY chat_msg_update ON chat_mensajes
FOR UPDATE USING (
  -- Solo el remitente puede editar/borrar su propio mensaje
  remitente_id = chat_usuario_id()
);


-- ─── 6. Realtime publication ────────────────────────────────
-- Para que Supabase Realtime emita eventos al frontend.
-- ALTER PUBLICATION es idempotente con DO + EXCEPTION.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_mensajes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversaciones;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_participantes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── 7. Storage bucket para adjuntos ────────────────────────
-- Bucket privado (no público) — solo accesible vía signed URLs desde el API.
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-adjuntos', 'chat-adjuntos', false)
ON CONFLICT (id) DO NOTHING;


-- ─── 8. Refresh schema cache ────────────────────────────────
NOTIFY pgrst, 'reload schema';
