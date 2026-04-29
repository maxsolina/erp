-- ============================================================
-- 086 — MÓDULO USUARIOS
-- Modelo de datos completo del módulo Usuarios y Permisos.
-- Reemplaza el array hardcodeado en contexts/erp-context.tsx.
-- ============================================================
-- Tablas creadas:
--   1. usuarios              (perfil ERP linkeado a auth.users)
--   2. usuario_cajas         (N:N usuario ↔ cajas permitidas)
--   3. usuario_depositos     (N:N usuario ↔ depósitos permitidos)
--   4. usuario_permisos      (vistas + permisos puntuales por usuario)
--   5. catalogo_permisos     (lista maestra de permisos del sistema)
--   6. usuario_sesiones      (log de sesiones de login)
--
-- usuario_sucursales ya existía: NO se toca, se mantiene tal cual.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABLA usuarios
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                   SERIAL PRIMARY KEY,
  auth_user_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre               TEXT NOT NULL,
  username             TEXT NOT NULL UNIQUE,
  email                TEXT NOT NULL UNIQUE,
  avatar_url           TEXT,
  sucursal_default_id  INTEGER REFERENCES sucursales(id) ON DELETE SET NULL,
  is_superuser         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_user_id ON usuarios(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email        ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_username     ON usuarios(username);


-- ─────────────────────────────────────────────────────────────
-- 2. TABLA usuario_cajas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_cajas (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  caja_id     UUID    NOT NULL REFERENCES cajas(id)    ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, caja_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_cajas_usuario ON usuario_cajas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_cajas_caja    ON usuario_cajas(caja_id);


-- ─────────────────────────────────────────────────────────────
-- 3. TABLA usuario_depositos
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_depositos (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  deposito_id INTEGER NOT NULL REFERENCES depositos(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, deposito_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_depositos_usuario  ON usuario_depositos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_depositos_deposito ON usuario_depositos(deposito_id);


-- ─────────────────────────────────────────────────────────────
-- 4. TABLA usuario_permisos
-- vistas:   { "ventas": true, "compras": false, ... }
-- permisos: { "productos": { "_entity": "edit", "ver_costo": "read", "modificar_costo_manual": false }, ... }
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_permisos (
  usuario_id  INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  vistas      JSONB NOT NULL DEFAULT '{}'::jsonb,
  permisos    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 5. TABLA catalogo_permisos
-- Lista maestra de permisos del sistema. El form de Usuarios
-- la lee y renderiza los controles dinámicamente.
-- tipo:
--   'view'     → checkbox de vistas (sección A)
--   'entity'   → slider 3-niveles para una entidad principal
--   'slider'   → slider 3-niveles dentro de un módulo
--   'checkbox' → checkbox simple sí/no
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalogo_permisos (
  id          TEXT PRIMARY KEY,
  modulo      TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('view', 'entity', 'slider', 'checkbox')),
  label       TEXT NOT NULL,
  descripcion TEXT,
  orden       INTEGER NOT NULL DEFAULT 0,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalogo_permisos_modulo ON catalogo_permisos(modulo);

-- Seed: las "Vistas" iniciales (Sección A del tab Permisos del spec)
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden) VALUES
  ('configuracion', 'configuracion', 'view', 'Configuración',     'Acceso al módulo Configuración (Sucursales, Listas de Precios, Productos master, Proveedores)', 10),
  ('productos',     'productos',     'view', 'Productos',         'Acceso al módulo de Productos',     20),
  ('ventas',        'ventas',        'view', 'Ventas',            'Acceso a NV, OE, Remitos y Facturas de venta', 30),
  ('compras',       'compras',       'view', 'Compras',           'Acceso a OC, Recepciones, Facturas de compra, OP, Legajos de Importación', 40),
  ('stock',         'stock',         'view', 'Stock',             'Acceso a Movimientos y Transferencias de stock', 50),
  ('contabilidad',  'contabilidad',  'view', 'Contabilidad',      'Acceso a Cajas, Pagos, Cobros y libros contables', 60),
  ('servicio_tecnico', 'servicio_tecnico', 'view', 'Servicio Técnico', 'Acceso a Órdenes de Trabajo del taller',     70),
  ('toma_equipo',   'toma_equipo',   'view', 'Toma de Equipo',    'Acceso al circuito de Parte de pago / Toma de equipo', 80),
  ('reportes',      'reportes',      'view', 'Reportes',          'Acceso a Dashboards e Informes', 90)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. TABLA usuario_sesiones
-- Log de cada sesión de login, para la tab "Sesiones de Usuario".
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario_sesiones (
  id                       BIGSERIAL PRIMARY KEY,
  usuario_id               INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  auth_session_id          TEXT,                 -- referencia opcional a la sesión de Supabase Auth
  ip                       INET,
  ubicacion                TEXT,                 -- geo IP cuando esté disponible
  sistema_operativo        TEXT,
  navegador                TEXT,
  version_navegador        TEXT,
  login_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at                TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ,
  tipo_cierre              TEXT CHECK (tipo_cierre IN ('logout_manual', 'expirada', 'invalida', 'forzada')),
  terminada_por            TEXT CHECK (terminada_por IN ('usuario', 'sistema', 'administrador')),
  terminada_por_user_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  razon                    TEXT
);

CREATE INDEX IF NOT EXISTS idx_usuario_sesiones_usuario ON usuario_sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_sesiones_login   ON usuario_sesiones(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuario_sesiones_activas ON usuario_sesiones(usuario_id) WHERE logout_at IS NULL;


-- ─────────────────────────────────────────────────────────────
-- 7. FUNCIÓN HELPER: ¿el usuario logueado es superusuario?
-- Se usa adentro de las RLS policies para no repetir lógica.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_current_user_superuser() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_superuser FROM usuarios WHERE auth_user_id = auth.uid()),
    FALSE
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- Política conservadora: cada usuario ve su propio registro;
-- los superusuarios ven y modifican todo.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_cajas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_permisos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_sesiones  ENABLE ROW LEVEL SECURITY;

-- usuarios: cada uno ve su propia fila; los superusers ven/modifican todas
DROP POLICY IF EXISTS usuarios_select ON usuarios;
CREATE POLICY usuarios_select ON usuarios FOR SELECT
  USING (auth_user_id = auth.uid() OR public.is_current_user_superuser());

DROP POLICY IF EXISTS usuarios_modify ON usuarios;
CREATE POLICY usuarios_modify ON usuarios FOR ALL
  USING (public.is_current_user_superuser())
  WITH CHECK (public.is_current_user_superuser());

-- usuario_cajas / depositos: superusers + el propio usuario (solo SELECT)
DROP POLICY IF EXISTS usuario_cajas_select ON usuario_cajas;
CREATE POLICY usuario_cajas_select ON usuario_cajas FOR SELECT
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR public.is_current_user_superuser()
  );
DROP POLICY IF EXISTS usuario_cajas_modify ON usuario_cajas;
CREATE POLICY usuario_cajas_modify ON usuario_cajas FOR ALL
  USING (public.is_current_user_superuser())
  WITH CHECK (public.is_current_user_superuser());

DROP POLICY IF EXISTS usuario_depositos_select ON usuario_depositos;
CREATE POLICY usuario_depositos_select ON usuario_depositos FOR SELECT
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR public.is_current_user_superuser()
  );
DROP POLICY IF EXISTS usuario_depositos_modify ON usuario_depositos;
CREATE POLICY usuario_depositos_modify ON usuario_depositos FOR ALL
  USING (public.is_current_user_superuser())
  WITH CHECK (public.is_current_user_superuser());

-- usuario_permisos: idem patrón
DROP POLICY IF EXISTS usuario_permisos_select ON usuario_permisos;
CREATE POLICY usuario_permisos_select ON usuario_permisos FOR SELECT
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR public.is_current_user_superuser()
  );
DROP POLICY IF EXISTS usuario_permisos_modify ON usuario_permisos;
CREATE POLICY usuario_permisos_modify ON usuario_permisos FOR ALL
  USING (public.is_current_user_superuser())
  WITH CHECK (public.is_current_user_superuser());

-- catalogo_permisos: lectura abierta a cualquier autenticado, modificación solo superusers
DROP POLICY IF EXISTS catalogo_permisos_select ON catalogo_permisos;
CREATE POLICY catalogo_permisos_select ON catalogo_permisos FOR SELECT
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS catalogo_permisos_modify ON catalogo_permisos;
CREATE POLICY catalogo_permisos_modify ON catalogo_permisos FOR ALL
  USING (public.is_current_user_superuser())
  WITH CHECK (public.is_current_user_superuser());

-- usuario_sesiones: cada uno ve su historial; superusers ven todo
DROP POLICY IF EXISTS usuario_sesiones_select ON usuario_sesiones;
CREATE POLICY usuario_sesiones_select ON usuario_sesiones FOR SELECT
  USING (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR public.is_current_user_superuser()
  );
DROP POLICY IF EXISTS usuario_sesiones_insert ON usuario_sesiones;
CREATE POLICY usuario_sesiones_insert ON usuario_sesiones FOR INSERT
  WITH CHECK (
    usuario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR public.is_current_user_superuser()
  );
DROP POLICY IF EXISTS usuario_sesiones_update ON usuario_sesiones;
CREATE POLICY usuario_sesiones_update ON usuario_sesiones FOR UPDATE
  USING (public.is_current_user_superuser())
  WITH CHECK (public.is_current_user_superuser());


-- ─────────────────────────────────────────────────────────────
-- 9. TRIGGER updated_at automático
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at        ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at        BEFORE UPDATE ON usuarios        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_usuario_permisos_updated_at ON usuario_permisos;
CREATE TRIGGER trg_usuario_permisos_updated_at BEFORE UPDATE ON usuario_permisos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 10. SEED INICIAL — solo Max como superusuario
-- Toma el UUID de auth.users matcheando por mail.
-- ─────────────────────────────────────────────────────────────
INSERT INTO usuarios (auth_user_id, nombre, username, email, sucursal_default_id, is_superuser, is_active)
SELECT
  au.id,
  'Max Solina',
  'solinamax',
  'max.solina@gmail.com',
  (SELECT id FROM sucursales WHERE activa = TRUE ORDER BY id LIMIT 1),  -- primera sucursal activa, o NULL si no hay
  TRUE,
  TRUE
FROM auth.users au
WHERE au.email = 'max.solina@gmail.com'
ON CONFLICT (email) DO UPDATE
  SET auth_user_id = EXCLUDED.auth_user_id,
      is_superuser = TRUE,
      is_active    = TRUE;

-- Crear el registro de permisos vacío (los superusers ignoran este JSON pero
-- así el front no tiene que validar la existencia de la fila).
INSERT INTO usuario_permisos (usuario_id, vistas, permisos)
SELECT id, '{}'::jsonb, '{}'::jsonb
FROM usuarios
WHERE email = 'max.solina@gmail.com'
ON CONFLICT (usuario_id) DO NOTHING;

-- Asociar Max a TODAS las sucursales activas (la default queda como principal)
INSERT INTO usuario_sucursales (usuario_id, sucursal_id, es_principal, ver_nv_otras_sucursales)
SELECT
  u.id,
  s.id,
  (s.id = u.sucursal_default_id),
  TRUE
FROM usuarios u
CROSS JOIN sucursales s
WHERE u.email = 'max.solina@gmail.com' AND s.activa = TRUE
ON CONFLICT (usuario_id, sucursal_id) DO NOTHING;

-- Asociar Max a TODOS los depósitos activos
INSERT INTO usuario_depositos (usuario_id, deposito_id)
SELECT u.id, d.id
FROM usuarios u
CROSS JOIN depositos d
WHERE u.email = 'max.solina@gmail.com' AND d.activo = TRUE
ON CONFLICT (usuario_id, deposito_id) DO NOTHING;

-- Asociar Max a TODAS las cajas activas
INSERT INTO usuario_cajas (usuario_id, caja_id)
SELECT u.id, c.id
FROM usuarios u
CROSS JOIN cajas c
WHERE u.email = 'max.solina@gmail.com' AND c.activo = TRUE
ON CONFLICT (usuario_id, caja_id) DO NOTHING;
