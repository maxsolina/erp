-- ============================================================
-- 125 · Agregar al catálogo permisos faltantes
--
-- Items que se crearon post-reforma de usuarios y nunca se sumaron
-- al catálogo de permisos. Sin esta entrada, `canSeeItem(modulo, key)`
-- evalúa undefined !== false → true → el item del sidebar / módulo
-- del topbar es visible para TODOS independientemente del permiso.
-- ============================================================

-- 1. Sub-vista Movimientos Bancarios (sidebar de Finanzas → Banco)
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('finanzas.movimientos_bancarios', 'finanzas', 'view', 'Movimientos Bancarios', 'Libro mayor de movimientos por cuenta bancaria', 35, 'finanzas')
ON CONFLICT (id) DO NOTHING;

-- 2. Módulo Mensajes (chat interno entre usuarios)
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('mensajes', 'mensajes', 'view', 'Mensajes', 'Chat interno entre usuarios del ERP', 95, NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Eliminar módulo huérfano "Productos" del catálogo.
-- En el script 086 quedó una entrada `('productos', 'productos', 'view', 'Productos', ...)`
-- como módulo top-level, pero el módulo nunca existió como tab del topbar — las URLs
-- `/productos/*` mapean a "deposito" en el layout. La entrada solo confundía al admin
-- al editar permisos (mostraba un toggle para un módulo que no existe).
DELETE FROM catalogo_permisos WHERE id = 'productos';
-- (Si algún usuario tenía `vistas["productos"]` en su usuario_permisos, queda como
--  clave huérfana en JSONB — no rompe nada, simplemente deja de aparecer en el form.)
