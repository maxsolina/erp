-- ============================================================
-- 087 — SUB-VISTAS DE PERMISOS
-- Agrega jerarquía padre→hijo al `catalogo_permisos` para que cada
-- módulo tenga sus propias vistas (ej: Ventas → Notas de Venta, Facturas, etc.)
-- y el form de Usuarios pueda activar/desactivar item por item.
-- ============================================================

-- 1. Columna parent_id en catalogo_permisos
ALTER TABLE catalogo_permisos
  ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES catalogo_permisos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_catalogo_permisos_parent ON catalogo_permisos(parent_id);


-- 2. SEED — sub-vistas por módulo
-- Cada sub-vista usa id "modulo.subkey" y parent_id apunta al módulo.

-- ─── CONFIGURACIÓN ───────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('configuracion.usuarios',         'configuracion', 'view', 'Usuarios',          'Acceso al módulo de Usuarios y Permisos',          10, 'configuracion'),
  ('configuracion.sucursales',       'configuracion', 'view', 'Sucursales',        'Acceso a la gestión de sucursales',                20, 'configuracion'),
  ('configuracion.listas_precios',   'configuracion', 'view', 'Listas de Precios', 'Acceso a listas de precios y sus versiones',       30, 'configuracion'),
  ('configuracion.proveedores',      'configuracion', 'view', 'Proveedores',       'Acceso al listado y ficha de proveedores',         40, 'configuracion'),
  ('configuracion.productos_master', 'configuracion', 'view', 'Productos master',  'Catálogo maestro de productos',                    50, 'configuracion'),
  ('configuracion.tarjetas',         'configuracion', 'view', 'Tarjetas',          'Configuración de tarjetas y recargos',             60, 'configuracion'),
  ('configuracion.terminos_pago',    'configuracion', 'view', 'Términos de pago',  'Configuración de términos de pago',                70, 'configuracion')
ON CONFLICT (id) DO NOTHING;

-- ─── VENTAS ──────────────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('ventas.clientes',          'ventas', 'view', 'Clientes',            'Listado y ficha de clientes',                     10, 'ventas'),
  ('ventas.notas_venta',       'ventas', 'view', 'Notas de Venta',      'NV — el documento que arranca el circuito',       20, 'ventas'),
  ('ventas.ordenes_entrega',   'ventas', 'view', 'Órdenes de Entrega',  'OE asociadas a una NV',                           30, 'ventas'),
  ('ventas.remitos',           'ventas', 'view', 'Remitos',             'Remitos de salida de stock',                      40, 'ventas'),
  ('ventas.facturas',          'ventas', 'view', 'Facturas',            'Facturas de venta',                               50, 'ventas'),
  ('ventas.recibos',           'ventas', 'view', 'Recibos',             'Recibos de cobro',                                60, 'ventas'),
  ('ventas.notas_credito',     'ventas', 'view', 'Notas de Crédito',    'NC — créditos a favor del cliente',               70, 'ventas'),
  ('ventas.notas_debito',      'ventas', 'view', 'Notas de Débito',     'ND — cargos al cliente',                          80, 'ventas'),
  ('ventas.ajustes',           'ventas', 'view', 'Ajustes de Cliente',  'Ajustes manuales de cuenta corriente',            90, 'ventas'),
  ('ventas.conciliacion',      'ventas', 'view', 'Conciliación CC',     'Conciliación de cuenta corriente',               100, 'ventas'),
  ('ventas.toma_equipo',       'ventas', 'view', 'Toma de Equipo',      'Parte de pago — recibo de equipo usado',         110, 'ventas')
ON CONFLICT (id) DO NOTHING;

-- ─── COMPRAS ─────────────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('compras.proveedores',          'compras', 'view', 'Proveedores',          'Listado y ficha de proveedores',           10, 'compras'),
  ('compras.cta_cte',              'compras', 'view', 'Cuenta Corriente',     'Movimientos de CC de proveedores',         20, 'compras'),
  ('compras.historial',             'compras', 'view', 'Historial',            'Historial de operaciones',                 30, 'compras'),
  ('compras.conciliacion_deuda',   'compras', 'view', 'Conciliación de Deuda','Conciliar pagos con facturas',             40, 'compras'),
  ('compras.ordenes_compra',       'compras', 'view', 'Órdenes de Compra',    'OC — el documento que arranca compras',    50, 'compras'),
  ('compras.recepciones',          'compras', 'view', 'Recepciones',          'Recepciones de mercadería',                60, 'compras'),
  ('compras.facturas',             'compras', 'view', 'Facturas',             'Facturas de compra',                       70, 'compras'),
  ('compras.notas_credito',        'compras', 'view', 'Notas de Crédito',     'NC de proveedor',                          80, 'compras'),
  ('compras.notas_debito',         'compras', 'view', 'Notas de Débito',      'ND de proveedor',                          90, 'compras'),
  ('compras.ordenes_pago',         'compras', 'view', 'Órdenes de Pago',      'OP — pagos a proveedores',                100, 'compras'),
  ('compras.legajos_importacion',  'compras', 'view', 'Legajos de Importación', 'Importaciones con gastos y distribución', 110, 'compras'),
  ('compras.despachos_simples',    'compras', 'view', 'Despachos Simples',    'Importaciones simples',                   120, 'compras')
ON CONFLICT (id) DO NOTHING;

-- ─── STOCK ───────────────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('stock.movimientos',     'stock', 'view', 'Movimientos',     'Movimientos de stock entre depósitos',  10, 'stock'),
  ('stock.transferencias',  'stock', 'view', 'Transferencias',  'Transferencias entre depósitos',        20, 'stock'),
  ('stock.ajustes',         'stock', 'view', 'Ajustes',         'Ajustes manuales de stock',             30, 'stock'),
  ('stock.depositos',       'stock', 'view', 'Depósitos',       'Configuración de depósitos',            40, 'stock'),
  ('stock.ubicaciones',     'stock', 'view', 'Ubicaciones',     'Ubicaciones internas dentro del depósito', 50, 'stock')
ON CONFLICT (id) DO NOTHING;

-- ─── CONTABILIDAD ────────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('contabilidad.cajas',        'contabilidad', 'view', 'Cajas',         'Gestión de cajas físicas',                10, 'contabilidad'),
  ('contabilidad.pagos',        'contabilidad', 'view', 'Pagos',         'Registro de pagos',                       20, 'contabilidad'),
  ('contabilidad.cobros',       'contabilidad', 'view', 'Cobros',        'Registro de cobros',                      30, 'contabilidad'),
  ('contabilidad.asientos',     'contabilidad', 'view', 'Asientos',      'Asientos contables generados',            40, 'contabilidad'),
  ('contabilidad.plan_cuentas', 'contabilidad', 'view', 'Plan de Cuentas','Plan de cuentas contable',                50, 'contabilidad'),
  ('contabilidad.diarios',      'contabilidad', 'view', 'Diarios',       'Configuración de diarios',                60, 'contabilidad'),
  ('contabilidad.cotizaciones', 'contabilidad', 'view', 'Cotizaciones',  'Cotizaciones de divisas',                 70, 'contabilidad'),
  ('contabilidad.periodos',     'contabilidad', 'view', 'Períodos',      'Períodos fiscales y cierre de mes',       80, 'contabilidad')
ON CONFLICT (id) DO NOTHING;

-- ─── SERVICIO TÉCNICO ────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('servicio_tecnico.ordenes_trabajo', 'servicio_tecnico', 'view', 'Órdenes de Trabajo', 'OT del taller',           10, 'servicio_tecnico'),
  ('servicio_tecnico.tecnicos',        'servicio_tecnico', 'view', 'Técnicos',           'Listado de técnicos',     20, 'servicio_tecnico'),
  ('servicio_tecnico.equipos',         'servicio_tecnico', 'view', 'Equipos',            'Catálogo de equipos',     30, 'servicio_tecnico'),
  ('servicio_tecnico.fallas',          'servicio_tecnico', 'view', 'Fallas',             'Catálogo de fallas',      40, 'servicio_tecnico'),
  ('servicio_tecnico.areas',           'servicio_tecnico', 'view', 'Áreas',              'Áreas de reparación',     50, 'servicio_tecnico'),
  ('servicio_tecnico.kanban',          'servicio_tecnico', 'view', 'Kanban',             'Vista kanban del flujo',  60, 'servicio_tecnico')
ON CONFLICT (id) DO NOTHING;

-- ─── TOMA DE EQUIPO ──────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('toma_equipo.parte_pago',  'toma_equipo', 'view', 'Parte de pago',  'Parte de pago — recibe equipo a cuenta',  10, 'toma_equipo'),
  ('toma_equipo.recepciones', 'toma_equipo', 'view', 'Recepciones',    'Recepciones generadas por toma de equipo', 20, 'toma_equipo')
ON CONFLICT (id) DO NOTHING;

-- ─── REPORTES ────────────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('reportes.dashboards',         'reportes', 'view', 'Dashboards',          'Dashboards de gestión',          10, 'reportes'),
  ('reportes.estadisticas_ventas','reportes', 'view', 'Estadísticas Ventas', 'Estadísticas detalladas de ventas', 20, 'reportes'),
  ('reportes.listados_gestion',   'reportes', 'view', 'Listados de gestión', 'Listados operativos',            30, 'reportes')
ON CONFLICT (id) DO NOTHING;
