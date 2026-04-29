-- ============================================================
-- 090 — Sub-vistas que se quedaron afuera del catálogo
-- ============================================================
-- Items que aparecían en el sidebar pero no en la tab Permisos del
-- form de Usuarios. Los sumamos para que se puedan tildar/destildar.
-- ============================================================

-- ─── VENTAS ──────────────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('ventas.senia_equipo',        'ventas', 'view', 'Seña de Equipo',        'Seña de equipo a cuenta',                           115, 'ventas'),
  ('ventas.listas_precios',      'ventas', 'view', 'Listas de Precios',     'Configuración de listas de precios',                200, 'ventas'),
  ('ventas.versiones_lista',     'ventas', 'view', 'Versiones de Lista',    'Versiones históricas de listas de precios',         210, 'ventas'),
  ('ventas.categorias_cliente',  'ventas', 'view', 'Categorías de Clientes','Categorías para agrupar clientes',                  220, 'ventas'),
  ('ventas.criterios_cotizador', 'ventas', 'view', 'Criterios Cotizador',   'Criterios y reglas del cotizador de tomas',         230, 'ventas'),
  ('ventas.nc_categorias',       'ventas', 'view', 'Categorías de NC',      'Categorías para agrupar Notas de Crédito',          240, 'ventas')
ON CONFLICT (id) DO NOTHING;

-- ─── COMPRAS ─────────────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('compras.cat_proveedores', 'compras', 'view', 'Categorías de Proveedores', 'Categorías para agrupar proveedores', 200, 'compras')
ON CONFLICT (id) DO NOTHING;
