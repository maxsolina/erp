-- ============================================================
-- 089 — Sub-vistas reales que faltan en Stock, Contabilidad y Taller
-- ============================================================
-- Ajusta el catálogo de permisos para que matchee 1:1 con los items
-- reales del sidebar de cada módulo.
-- ============================================================

-- ─── STOCK (Depósito) ────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('stock.productos',              'stock', 'view', 'Productos',                   'Listado de productos con stock',                10, 'stock'),
  ('stock.pedidos_abastecimiento', 'stock', 'view', 'Pedidos de Abastecimiento',   'Pedidos internos entre depósitos',              25, 'stock'),
  ('stock.lotes_series',           'stock', 'view', 'Lotes y Series',              'Lotes y números de serie / IMEI',               60, 'stock'),
  ('stock.lotes_stock',            'stock', 'view', 'IMEI en Stock',               'Vista de IMEI disponibles en stock',            70, 'stock'),
  ('stock.control_inventario',     'stock', 'view', 'Control de Inventario',       'Conteo y verificación de inventario',           80, 'stock'),
  ('stock.ajustes_positivos',      'stock', 'view', 'Ajustes Positivos',           'Ajustes de aumento de stock',                   90, 'stock'),
  ('stock.ajustes_negativos',      'stock', 'view', 'Ajustes Negativos',           'Ajustes de baja de stock',                     100, 'stock'),
  ('stock.config_depositos',       'stock', 'view', 'Configuración: Depósitos',    'Configuración de depósitos',                   110, 'stock'),
  ('stock.config_ubicaciones',     'stock', 'view', 'Configuración: Ubicaciones',  'Ubicaciones internas dentro del depósito',     120, 'stock'),
  ('stock.config_categorias',      'stock', 'view', 'Categorías de Ubicaciones',   'Categorías de ubicaciones',                    130, 'stock'),
  ('stock.config_tipos_operacion', 'stock', 'view', 'Tipos de operación',          'Tipos de operación de stock',                  140, 'stock'),
  ('stock.config_posiciones',      'stock', 'view', 'Posiciones de Ubicaciones',   'Posiciones físicas',                           150, 'stock'),
  ('stock.config_rutas',           'stock', 'view', 'Rutas',                       'Rutas de movimiento entre depósitos',          160, 'stock'),
  ('stock.config_reglas',          'stock', 'view', 'Reglas',                      'Reglas de reabastecimiento automático',        170, 'stock'),
  ('stock.cubo_stock',             'stock', 'view', 'Cubo de Stock',               'Vista pivot de stock',                         180, 'stock'),
  ('stock.stock_reservado',        'stock', 'view', 'Stock Reservado',             'Unidades reservadas',                          190, 'stock')
ON CONFLICT (id) DO NOTHING;

-- ─── CONTABILIDAD ────────────────────────────────────────────────────────────
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('contabilidad.asientos-automaticos',     'contabilidad', 'view', 'Asientos Contables',       'Asientos generados automáticamente',          5, 'contabilidad'),
  ('contabilidad.asientos-manuales',        'contabilidad', 'view', 'Asientos Manuales',        'Asientos cargados a mano',                    7, 'contabilidad'),
  ('contabilidad.libro-mayor',              'contabilidad', 'view', 'Libro Mayor',              'Libro mayor por cuenta',                      8, 'contabilidad'),
  ('contabilidad.control-presupuestario',   'contabilidad', 'view', 'Control Presupuestario',   'Control de presupuestos',                    11, 'contabilidad'),
  ('contabilidad.amortizaciones',           'contabilidad', 'view', 'Amortizaciones',           'Amortizaciones de activos',                  21, 'contabilidad'),
  ('contabilidad.devengamientos-diferidos', 'contabilidad', 'view', 'Devengamientos Diferidos', 'Devengamientos diferidos',                   22, 'contabilidad'),
  ('contabilidad.balance-general',          'contabilidad', 'view', 'Balance General',          'Reporte de balance general',                 31, 'contabilidad'),
  ('contabilidad.balance-sumas-saldos',     'contabilidad', 'view', 'Balance de Sumas y Saldos','Reporte de sumas y saldos',                  32, 'contabilidad'),
  ('contabilidad.estado-resultados',        'contabilidad', 'view', 'Estado de Resultados',     'Estado de resultados (PyG)',                 33, 'contabilidad'),
  ('contabilidad.libro-iva-digital',        'contabilidad', 'view', 'Libro IVA Digital',        'Libro IVA digital',                          34, 'contabilidad'),
  ('contabilidad.informes-contables',       'contabilidad', 'view', 'Informes Contables',       'Otros informes contables',                   35, 'contabilidad'),
  ('contabilidad.anos-fiscales',            'contabilidad', 'view', 'Años Fiscales',            'Configuración de años fiscales',             41, 'contabilidad'),
  ('contabilidad.plan-cuentas',             'contabilidad', 'view', 'Plan de Cuentas',          'Plan de cuentas contable',                   45, 'contabilidad'),
  ('contabilidad.tipos-cuenta',             'contabilidad', 'view', 'Tipos de Cuentas',         'Tipos de cuentas contables',                 46, 'contabilidad'),
  ('contabilidad.monedas',                  'contabilidad', 'view', 'Monedas',                  'Monedas habilitadas',                        61, 'contabilidad'),
  ('contabilidad.tipos-cotizacion',         'contabilidad', 'view', 'Tipos de Cotizaciones',    'Tipos de cotización',                        71, 'contabilidad')
ON CONFLICT (id) DO NOTHING;

-- ─── SERVICIO TÉCNICO (Taller) ───────────────────────────────────────────────
-- Sumamos las sub-vistas que faltaban (catalogos + configuración).
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('servicio_tecnico.dashboard',           'servicio_tecnico', 'view', 'Dashboard',             'Dashboard del taller',          5, 'servicio_tecnico'),
  ('servicio_tecnico.categorias_reparacion','servicio_tecnico','view', 'Categorías Reparación', 'Categorías de reparaciones',   55, 'servicio_tecnico'),
  ('servicio_tecnico.tipos_ot',            'servicio_tecnico', 'view', 'Tipos de OT',           'Tipos de orden de trabajo',    56, 'servicio_tecnico'),
  ('servicio_tecnico.fallas_equipo',       'servicio_tecnico', 'view', 'Fallas por Equipos',    'Asignación de fallas a equipos',57, 'servicio_tecnico'),
  ('servicio_tecnico.turnos',              'servicio_tecnico', 'view', 'Turnos de Técnicos',    'Turnos de técnicos',           58, 'servicio_tecnico'),
  ('servicio_tecnico.feriados',            'servicio_tecnico', 'view', 'Feriados',              'Feriados',                     59, 'servicio_tecnico'),
  ('servicio_tecnico.controles',           'servicio_tecnico', 'view', 'Controles / Checklist', 'Controles de calidad',         62, 'servicio_tecnico'),
  ('servicio_tecnico.motivos_cierre',      'servicio_tecnico', 'view', 'Motivos de Cierre',     'Motivos de cierre de OT',      63, 'servicio_tecnico')
ON CONFLICT (id) DO NOTHING;
