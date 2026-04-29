-- ============================================================
-- 088 — Sumar el módulo Finanzas al catálogo de permisos
-- ============================================================
-- El módulo "finanzas" no estaba en el catálogo. Lo sumamos como
-- vista padre + sus sub-vistas reales (mismas que aparecen en el
-- sidebar de modulo-finanzas.tsx).
-- ============================================================

-- 1. Vista padre: Finanzas (mismo nivel que ventas/compras/stock/etc.)
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden) VALUES
  ('finanzas', 'finanzas', 'view', 'Finanzas', 'Acceso al módulo Finanzas (cajas, bancos, cheques, tarjetas)', 65)
ON CONFLICT (id) DO NOTHING;

-- 2. Banco y Caja
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('finanzas.extractos_caja',         'finanzas', 'view', 'Extractos de Caja',         'Listado de extractos por caja',                10, 'finanzas'),
  ('finanzas.registros_caja',         'finanzas', 'view', 'Registros de Caja',         'Movimientos individuales de caja',             20, 'finanzas'),
  ('finanzas.ajustes_caja',           'finanzas', 'view', 'Ajustes de Caja',           'Ajustes manuales de caja',                     30, 'finanzas'),
  ('finanzas.registros_banco',        'finanzas', 'view', 'Registros de Banco',        'Movimientos individuales de banco',            40, 'finanzas'),
  ('finanzas.ajustes_banco',          'finanzas', 'view', 'Ajustes de Banco',          'Ajustes manuales de banco',                    50, 'finanzas'),
  ('finanzas.transferencias_caja',    'finanzas', 'view', 'Transferencias de Caja',    'Transferencias entre cajas',                   60, 'finanzas'),
  ('finanzas.conciliacion_bancaria',  'finanzas', 'view', 'Conciliación Bancaria',     'Conciliación con extractos del banco',         70, 'finanzas')
ON CONFLICT (id) DO NOTHING;

-- 3. Operaciones Financieras
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('finanzas.depositos',               'finanzas', 'view', 'Depósitos',                'Depósitos en bancos',                        80, 'finanzas'),
  ('finanzas.extracciones',            'finanzas', 'view', 'Extracciones',             'Extracciones de bancos',                     90, 'finanzas'),
  ('finanzas.transferencias_bancarias','finanzas', 'view', 'Transferencias Bancarias', 'Transferencias entre bancos',               100, 'finanzas'),
  ('finanzas.conversion_monedas',      'finanzas', 'view', 'Conversión de Monedas',    'Conversión entre divisas',                  110, 'finanzas'),
  ('finanzas.prestamos',               'finanzas', 'view', 'Préstamos',                'Gestión de préstamos',                       120, 'finanzas'),
  ('finanzas.negociacion_cheques',     'finanzas', 'view', 'Negociación de Cheques',   'Negociación / descuento de cheques',         130, 'finanzas')
ON CONFLICT (id) DO NOTHING;

-- 4. Cheques
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('finanzas.cheques_terceros', 'finanzas', 'view', 'Cheques de Terceros', 'Cheques recibidos de terceros',  140, 'finanzas'),
  ('finanzas.cheques_propios',  'finanzas', 'view', 'Cheques Propios',     'Chequera propia',                150, 'finanzas')
ON CONFLICT (id) DO NOTHING;

-- 5. Conciliación de Tarjetas
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('finanzas.cupones',                'finanzas', 'view', 'Cupones',                'Cupones de tarjeta a conciliar', 160, 'finanzas'),
  ('finanzas.conciliacion_tarjetas',  'finanzas', 'view', 'Conciliación de Tarjetas','Conciliación con liquidación', 170, 'finanzas')
ON CONFLICT (id) DO NOTHING;

-- 6. Configuración (de Finanzas)
INSERT INTO catalogo_permisos (id, modulo, tipo, label, descripcion, orden, parent_id) VALUES
  ('finanzas.conceptos',         'finanzas', 'view', 'Conceptos',           'Conceptos de movimiento',         180, 'finanzas'),
  ('finanzas.bancos_config',     'finanzas', 'view', 'Bancos',              'Configuración de bancos',         190, 'finanzas'),
  ('finanzas.cajas',             'finanzas', 'view', 'Cajas',               'Configuración de cajas',          200, 'finanzas'),
  ('finanzas.tarjetas',          'finanzas', 'view', 'Tarjetas',            'Configuración de tarjetas',       210, 'finanzas'),
  ('finanzas.grupos',            'finanzas', 'view', 'Grupos de Tarjetas',  'Grupos de tarjetas',              220, 'finanzas'),
  ('finanzas.recargos',          'finanzas', 'view', 'Recargos de Tarjetas','Recargos por tarjeta y cuotas',   230, 'finanzas'),
  ('finanzas.tipos_prestamos',   'finanzas', 'view', 'Tipos de Préstamos',  'Catálogo de préstamos',           240, 'finanzas'),
  ('finanzas.simulador',         'finanzas', 'view', 'Simulador de Recargos','Simulador',                      250, 'finanzas')
ON CONFLICT (id) DO NOTHING;
