-- ============================================================================
-- 013_seed_plan_cuentas.sql
-- Plan de Cuentas - Cell Home
-- Versión definitiva - Leandro D'Almeida (Contador)
-- Total: 351 cuentas
-- Requiere: 012_create_contabilidad.sql ejecutado previamente
-- IDEMPOTENTE: usa ON CONFLICT (codigo) DO NOTHING
-- ============================================================================

-- Agregar tipo "Puente" si aún no existe (no fue incluido en 012)
INSERT INTO contabilidad_tipos_cuenta (nombre, codigo, es_resultado, categoria_balance_pyg)
VALUES ('Puente', 'puente', false, NULL)
ON CONFLICT (codigo) DO NOTHING;

-- ─── Seed del Plan de Cuentas ────────────────────────────────────────────────
-- Columnas del CTE: codigo, nombre, tipo_interno, tipo_cuenta_cod, permite_conciliacion, es_cuenta_puente

WITH cuentas(codigo, nombre, tipo_interno, tipo_cuenta_cod, permite_conciliacion, es_cuenta_puente) AS (
  VALUES

  -- ── ACTIVO CORRIENTE - DISPONIBILIDADES EN EMPRESA ───────────────────────
  ('11010101'::text, 'Caja Moneda Nacional'::text,                       'liquidez'::text, 'activo'::text, false::bool, false::bool),
  ('11010102', 'Caja Moneda Extranjera Dólares',                         'liquidez', 'activo', false, false),
  ('11010103', 'Caja Moneda Extranjera Euros',                           'liquidez', 'activo', false, false),
  ('11010104', 'Valores a Depositar',                                    'liquidez', 'activo', false, false),
  ('11010105', 'Fondos Fijos',                                           'liquidez', 'activo', false, false),
  ('11010106', 'Vouchers',                                               'regular',  'activo', false, false),
  ('11010107', 'Transferencia entre Cajas',                              'regular',  'activo', false, false),
  ('11010108', 'Valores en Tránsito',                                    'regular',  'activo', false, false),
  ('11010109', 'Cheques de Terceros en Tránsito',                        'regular',  'activo', false, false),
  ('11010110', 'Efectivo en Tránsito',                                   'regular',  'activo', false, false),
  ('11010111', 'Dolares en Tránsito',                                    'regular',  'activo', false, false),
  ('11010112', 'Transferencia entre Cajas Subcompañías',                 'regular',  'activo', false, false),

  -- ── ACTIVO CORRIENTE - DISPONIBILIDADES EN BANCOS ────────────────────────
  ('11010201',  'Banco Macro CC',                                        'liquidez', 'activo', true,  false),
  ('110102011', 'Banco Galicia CC',                                      'liquidez', 'activo', true,  false),
  ('110102012', 'JP Morgan Chase CC',                                    'liquidez', 'activo', true,  false),
  ('11010202',  'Mercado libre',                                         'liquidez', 'activo', true,  false),
  ('11010204',  'Banco Intermedio Megatone',                             'liquidez', 'activo', true,  false),
  ('11010205',  'Banco Intermedio Frávega',                              'liquidez', 'activo', true,  false),
  ('11010206',  'Banco Intermedio On City',                              'liquidez', 'activo', true,  false),
  ('1101023',   'Banco Santa Fe',                                        'liquidez', 'activo', true,  false),
  ('1101024',   'Billetera Santa Fe',                                    'liquidez', 'activo', true,  false),
  ('1101025',   'Banco Macro USD CC',                                    'liquidez', 'activo', true,  false),
  ('1101026',   'Banco de la Nación',                                    'liquidez', 'activo', true,  false),
  ('1101027',   'Banco de la Nación USD',                                'liquidez', 'activo', true,  false),
  ('1101028',   'Nuevo Banco Exterior',                                  'liquidez', 'activo', true,  false),
  ('1101029',   'Banco Santander Río',                                   'liquidez', 'activo', true,  false),
  ('1101030',   'Banco Francés',                                         'liquidez', 'activo', true,  false),

  -- ── ACTIVO CORRIENTE - INVERSIONES TEMPORARIAS ───────────────────────────
  ('11020101', 'Depósitos a Plazo Fijo Pesos',                           'regular', 'activo', false, false),
  ('11020102', 'Depósitos a Plazo Fijo Moneda Extranjera',               'regular', 'activo', false, false),
  ('11020103', 'Inversión en Moneda Extranjera',                         'regular', 'activo', false, false),
  ('11020104', 'Inversiones Corrientes',                                 'regular', 'activo', false, false),
  ('11020105', 'TSA',                                                    'regular', 'activo', false, false),

  -- ── ACTIVO CORRIENTE - CRÉDITOS POR VENTAS ───────────────────────────────
  ('11030101', 'Deudores por Ventas',                                    'a_cobrar', 'activo', true,  false),
  ('11030102', 'Deudores por Ventas del Exterior',                       'a_cobrar', 'activo', true,  false),
  ('11030103', 'Previsión Deudores Incobrables',                         'regular',  'activo', false, false),
  ('11030104', 'Tarjetas de Débito / Crédito a Cobrar',                  'liquidez', 'activo', false, false),
  ('11030105', 'Cobranza Pendientes de Asignar',                         'regular',  'activo', false, false),
  ('11030106', 'Cheques de Pago Diferido a Cobrar',                      'regular',  'activo', false, false),
  ('11030107', 'Deudores Morosos',                                       'a_cobrar', 'activo', true,  false),
  ('11030108', 'Deudores en Gestión Judicial',                           'a_cobrar', 'activo', true,  false),
  ('11030109', 'Cheques Rechazados',                                     'regular',  'activo', false, false),
  ('11030110', 'Remitos Pendientes de Facturar',                         'regular',  'activo', false, false),
  ('11030111', 'Deudores Varios',                                        'a_cobrar', 'activo', true,  false),
  ('11030112', 'Tarjeta Payway a Cobrar',                                'liquidez', 'activo', false, false),
  ('11030113', 'Tarjeta Viumi a Cobrar',                                 'liquidez', 'activo', false, false),
  ('11030114', 'Tarjeta Getnet a Cobrar',                                'liquidez', 'activo', false, false),
  ('11030115', 'Tarjeta Nave a Cobrar',                                  'liquidez', 'activo', false, false),

  -- ── ACTIVO CORRIENTE - CRÉDITOS FISCALES ─────────────────────────────────
  ('11040101', 'I.V.A. Crédito Fiscal',                                  'regular', 'activo', false, false),
  ('11040102', 'I.V.A. Percepciones',                                    'regular', 'activo', false, false),
  ('11040103', 'I.V.A. Retenciones',                                     'regular', 'activo', false, false),
  ('11040104', 'I.V.A. Saldo a Técnico Favor',                           'regular', 'activo', false, false),
  ('11040106', 'I.V.A. Crédito por Decreto 814',                         'regular', 'activo', false, false),
  ('11040107', 'IIBB Percepciones',                                      'regular', 'activo', false, false),
  ('11040108', 'IIBB Retenciones',                                       'regular', 'activo', false, false),
  ('11040109', 'Impuesto a las Ganancias Anticipos',                     'regular', 'activo', false, false),
  ('11040110', 'Impuesto a las Ganancias Retenciones',                   'regular', 'activo', false, false),
  ('11040112', 'Ley 25413 s/ Debitos Bancarios',                         'regular', 'activo', false, false),
  ('11040113', 'Ley 25413 s/ Créditos Bancarios',                        'regular', 'activo', false, false),
  ('11040117', 'Impuesto a los Ingresos Brutos a Favor',                 'regular', 'activo', false, false),
  ('11040118', 'Impuesto a las Ganancias Libre Disponibilidad',          'regular', 'activo', false, false),
  ('11040119', 'Sircreb IIBB',                                           'regular', 'activo', false, false),
  ('11040120', 'IIBB Percepciones a Compensar',                          'regular', 'activo', false, false),
  ('11040121', 'Intereses Fiscales a Devengar',                          'regular', 'activo', false, false),
  ('11040122', 'Recupero Crédito Fiscal Min. de Trabajo',                'regular', 'activo', false, false),
  ('11040123', 'DREI Retenciones',                                       'regular', 'activo', false, false),
  ('11040124', 'I.V.A. Saldo Libre Disponibilidad',                      'regular', 'activo', false, false),

  -- ── ACTIVO CORRIENTE - CRÉDITOS LABORALES ────────────────────────────────
  ('11040201', 'Anticipos de Sueldos',                                   'regular',  'activo', false, false),
  ('11040202', 'Anticipos de Gastos a Rendir',                           'liquidez', 'activo', false, false),
  ('11040203', 'Sueldos a Recuperar por ART',                            'regular',  'activo', false, false),
  ('11040204', 'SUSS Retenciones',                                       'regular',  'activo', false, false),
  ('11040205', 'SUSS Percepciones',                                      'regular',  'activo', false, false),
  ('11040206', 'Anticipos de Comisiones',                                'regular',  'activo', false, false),

  -- ── ACTIVO CORRIENTE - PROPIETARIOS ──────────────────────────────────────
  ('11040301', 'Cuenta Particular Solina Max',                           'regular', 'activo', false, false),
  ('11040302', 'Cuenta Particular Mansilla Martín',                      'regular', 'activo', false, false),

  -- ── ACTIVO CORRIENTE - OTROS CRÉDITOS ────────────────────────────────────
  ('11040401', 'Seguros a Devengar',                                     'regular', 'activo', false, false),
  ('11040402', 'Seguros Pagados por Adelantado',                         'regular', 'activo', false, false),
  ('11040403', 'Intereses Bancarios a Devengar',                         'regular', 'activo', false, false),
  ('11040407', 'Préstamos Obtenidos',                                    'regular', 'activo', false, false),
  ('11040408', 'Otros Créditos Diversos',                                'regular', 'activo', false, false),
  ('11040410', 'Compensación Deudores - Proveedores',                    'regular', 'activo', false, false),
  ('11040425', 'Otros Créditos',                                         'regular', 'activo', false, false),

  -- ── ACTIVO CORRIENTE - BIENES DE CAMBIO ──────────────────────────────────
  ('11050101', 'Productos Terminados',                                   'regular', 'activo', false, false),
  ('11050102', 'Mercadería de Reventa',                                  'regular', 'activo', false, false),
  ('11050103', 'Equipos en Parte Pago',                                  'regular', 'activo', false, false),
  ('11050201', 'Materia Prima',                                          'regular', 'activo', false, false),
  ('11050202', 'Insumos reparaciones',                                   'regular', 'activo', false, false),
  ('11050301', 'PT en Tránsito',                                         'regular', 'activo', false, false),
  ('11050302', 'Reposiciones',                                           'regular', 'activo', false, false),
  ('11050303', 'Activos en Tránsito',                                    'regular', 'activo', false, false),

  -- ── ACTIVO NO CORRIENTE - BIENES DE USO ──────────────────────────────────
  ('12010101', 'Terrenos Valor de Origen',                               'regular', 'activo', false, false),
  ('12010201', 'Edificios Valor de Origen',                              'regular', 'activo', false, false),
  ('12010202', 'Edificios Amortizaciones Acumuladas',                    'regular', 'activo', false, false),
  ('12010203', 'Obras en Curso',                                         'regular', 'activo', false, false),
  ('12010204', 'Mejoras Valor de Origen',                                'regular', 'activo', false, false),
  ('12010205', 'Mejoras Amortizaciones Acumuladas',                      'regular', 'activo', false, false),
  ('12010301', 'Instalaciones Valor de Origen',                          'regular', 'activo', false, false),
  ('12010302', 'Instalaciones Amortizaciones Acumuladas',                'regular', 'activo', false, false),
  ('12010401', 'Muebles y Utiles Valor de Origen',                       'regular', 'activo', false, false),
  ('12010402', 'Muebles y Utiles Amortizaciones Acumuladas',             'regular', 'activo', false, false),
  ('12010501', 'Computadoras Valor de Origen',                           'regular', 'activo', false, false),
  ('12010502', 'Computadoras Amortizaciones Acumuladas',                 'regular', 'activo', false, false),
  ('12010503', 'Software Valor de Origen',                               'regular', 'activo', false, false),
  ('12010504', 'Software Amortizaciones Acumuladas',                     'regular', 'activo', false, false),
  ('12010701', 'Rodados Valor de Origen',                                'regular', 'activo', false, false),
  ('12010702', 'Rodados Amortizaciones Acumuladas',                      'regular', 'activo', false, false),
  ('12010801', 'Maquinarias',                                            'regular', 'activo', false, false),
  ('12010802', 'Maquinarias Amortizaciones Acumuladas',                  'regular', 'activo', false, false),

  -- ── ACTIVO NO CORRIENTE - BIENES INTANGIBLES ─────────────────────────────
  ('12020101', 'Marcas y Patentes Valor de Origen',                      'regular', 'activo', false, false),
  ('12020102', 'Marcas y Patentes Amortizaciones Acumuladas',            'regular', 'activo', false, false),
  ('12020301', 'Certificación de Normas Valor',                          'regular', 'activo', false, false),
  ('12020302', 'Certificación de Normas Amortizaciones',                 'regular', 'activo', false, false),

  -- ── PASIVO CORRIENTE - DEUDAS COMERCIALES ────────────────────────────────
  ('21010101', 'Proveedores',                                            'a_pagar', 'pasivo', true,  false),
  ('21010102', 'Proveedores del Exterior',                               'a_pagar', 'pasivo', true,  false),
  ('21010103', 'Documentos a Pagar',                                     'regular', 'pasivo', false, false),
  ('21010104', 'Anticipos de Clientes',                                  'regular', 'pasivo', false, false),
  ('21010105', 'Cheques Diferidos',                                      'regular', 'pasivo', false, false),
  ('21010107', 'Acreedores Varios',                                      'a_pagar', 'pasivo', true,  false),
  ('21010108', 'Liquidaciones de Pago Pendientes',                       'regular', 'pasivo', false, false),
  ('21010110', 'Canje de Cheques',                                       'a_pagar', 'pasivo', false, false),

  -- ── PASIVO CORRIENTE - DEUDAS FISCALES ───────────────────────────────────
  ('21010301', 'I.V.A. Débito Fiscal',                                   'regular', 'pasivo', false, false),
  ('21010302', 'I.V.A. a Pagar',                                         'a_pagar', 'pasivo', false, false),
  ('21010303', 'IIBB a Pagar',                                           'a_pagar', 'pasivo', false, false),
  ('21010305', 'Impuesto a las Ganancias A Pagar',                       'a_pagar', 'pasivo', false, false),
  ('21010306', 'Provisión Impuesto a las Ganancias',                     'regular', 'pasivo', false, false),
  ('21010309', 'SUSS Retenciones',                                       'regular', 'pasivo', false, false),
  ('21010310', 'IIBB Retenciones',                                       'regular', 'pasivo', false, false),
  ('21010311', 'Retención de Ganancias 4ta Categoría',                   'regular', 'pasivo', false, false),
  ('21010313', 'DREI a Pagar',                                           'a_pagar', 'pasivo', false, false),
  ('21010316', 'Planes de Pago AFIP',                                    'regular', 'pasivo', false, false),
  ('21010317', 'Convenio DREI a Pagar',                                  'regular', 'pasivo', false, false),
  ('21010318', 'Bienes Personales - Acc. Part. A Pagar',                 'a_pagar', 'pasivo', false, false),
  ('21010319', 'Convenio API a Pagar',                                   'regular', 'pasivo', false, false),
  ('21010321', 'Impuesto Inmobiliario a Pagar',                          'a_pagar', 'pasivo', false, false),
  ('21010322', 'TGI a Pagar',                                            'a_pagar', 'pasivo', false, false),

  -- ── PASIVO CORRIENTE - DEUDAS LABORALES ──────────────────────────────────
  ('21010401', 'Sueldos a Pagar (por Recibo)',                           'regular', 'pasivo', false, false),
  ('21010402', 'Provisión S.A.C.',                                       'regular', 'pasivo', false, false),
  ('21010405', 'Cuota Sindical a Pagar',                                 'regular', 'pasivo', false, false),
  ('21010412', 'Libre para Usar',                                        'regular', 'pasivo', false, false),
  ('21010413', 'Planes facilidades de Pago a Pagar',                     'regular', 'pasivo', false, false),
  ('21010414', 'Sueldos a Pagar',                                        'a_pagar', 'pasivo', false, false),
  ('21010415', 'AEC a Pagar',                                            'a_pagar', 'pasivo', false, false),
  ('21010416', 'FAECYS a Pagar',                                         'a_pagar', 'pasivo', false, false),
  ('21010417', 'INACAP a Pagar',                                         'a_pagar', 'pasivo', false, false),
  ('21010418', 'OSECAC a Pagar',                                         'a_pagar', 'pasivo', false, false),
  ('21010419', 'SUSS a Pagar',                                           'a_pagar', 'pasivo', false, false),

  -- ── PASIVO CORRIENTE - OTRAS DEUDAS ──────────────────────────────────────
  ('21010601', 'Dividendos a Pagar',                                     'regular',  'pasivo', false, false),
  ('21010602', 'Honorarios Directores a Pagar',                          'regular',  'pasivo', false, false),
  ('21010603', 'Acreedores Diversos',                                    'regular',  'pasivo', false, false),
  ('21010604', 'Tarjetas Corporativas a Pagar',                          'liquidez', 'pasivo', false, false),

  -- ── PASIVO CORRIENTE - DEUDAS FINANCIERAS ────────────────────────────────
  ('21010701', 'Adelantos en Cta. Cte. Bancarias',                       'regular', 'pasivo', false, false),
  ('21010702', 'Préstamos Temporarios a pagar',                          'a_pagar', 'pasivo', false, false),
  ('21010703', 'USD - Otros Préstamos Financieros a pagar',              'a_pagar', 'pasivo', false, false),
  ('21010704', 'Préstamos Bancarios',                                    'a_pagar', 'pasivo', false, false),
  ('21010705', 'Préstamo SGR',                                           'a_pagar', 'pasivo', false, false),

  -- ── PASIVO NO CORRIENTE ───────────────────────────────────────────────────
  ('22010105', 'Otras deudas',                                           'regular', 'pasivo', false, false),

  -- ── PATRIMONIO NETO - CAPITAL ─────────────────────────────────────────────
  ('31010101', 'Capital Suscripto',                                      'regular', 'patrimonio_neto', false, false),
  ('31010102', 'Ajustes al Capital',                                     'regular', 'patrimonio_neto', false, false),
  ('31010103', 'Aportes Irrevocables',                                   'regular', 'patrimonio_neto', false, false),

  -- ── PATRIMONIO NETO - RESERVAS LEGALES ────────────────────────────────────
  ('32010101', 'Reserva Legal',                                          'regular', 'patrimonio_neto', false, false),
  ('32010102', 'Reserva Legal Ajustada',                                 'regular', 'patrimonio_neto', false, false),

  -- ── PATRIMONIO NETO - RESULTADOS ACUMULADOS ───────────────────────────────
  ('33010101', 'Resultados Acumulados del Ejercicio Anterior',           'regular', 'patrimonio_neto', false, false),
  ('33010102', 'Resultados Acumulados del Ejercicio',                    'regular', 'patrimonio_neto', false, false),
  ('33010103', 'Saldo revaluo Técnico',                                  'regular', 'patrimonio_neto', false, false),
  ('35010101', 'Socio Martín Mansilla',                                  'regular', 'patrimonio_neto', false, false),
  ('35010102', 'Socio Max Solina',                                       'regular', 'patrimonio_neto', false, false),

  -- ── INGRESOS - VENTAS NETAS ───────────────────────────────────────────────
  ('41010101', 'Ventas Mercadería',                                      'regular', 'ingresos', false, false),
  ('41010102', 'Ventas servicio tecnico Mano Obra',                      'regular', 'ingresos', false, false),
  ('41010103', 'Ventas servicio tecnico Repuestos',                      'regular', 'ingresos', false, false),
  ('41010105', 'Ventas Mercadería (IVA)',                                 'regular', 'ingresos', false, false),
  ('41010106', 'Ventas Mercadería (Recargo TC)',                          'regular', 'ingresos', false, false),

  -- ── INGRESOS - REGULARIZADORAS DE VENTAS ─────────────────────────────────
  ('41010201', 'Bonificaciones',                                         'regular', 'ingresos', false, false),
  ('41010202', 'Ventas Internas',                                        'regular', 'ingresos', false, false),
  ('41010203', 'Envios a Cargo',                                         'regular', 'ingresos', false, false),

  -- ── INGRESOS - REINTEGROS ─────────────────────────────────────────────────
  ('41010301', 'Subsidios',                                              'regular', 'ingresos', false, false),
  ('41010304', 'Otros Reintegros',                                       'regular', 'ingresos', false, false),
  ('41010305', 'Rucci',                                                  'regular', 'ingresos', false, false),

  -- ── EGRESOS - COSTO DE MERCADERÍA VENDIDA ────────────────────────────────
  ('42010101', 'CMV Productos Terminados',                               'regular', 'egresos', false, false),
  ('42010102', 'CMV Mercadería de Reventa',                              'regular', 'egresos', false, false),
  ('42010103', 'Ajuste de Inventario Positivo',                          'regular', 'egresos', false, false),
  ('42010104', 'Ajuste de Inventario Negativo',                          'regular', 'egresos', false, false),
  ('42010105', 'Recepción de Usados',                                    'regular', 'egresos', false, false),

  -- ── EGRESOS - COSTOS VARIABLES DE COMERCIALIZACIÓN ───────────────────────
  ('42010201',  'Fletes por Traslado',                                   'regular', 'egresos', false, false),
  ('42010202',  'Diferencia por Redondeo',                               'regular', 'egresos', false, false),
  ('42010203',  'Comisiones por Ventas',                                 'regular', 'egresos', false, false),
  ('42010204',  'Comisiones por Cobranzas',                              'regular', 'egresos', false, false),
  ('42010205',  'Comisiones TC Payway',                                  'regular', 'egresos', false, false),
  ('42010207',  'Comisiones TC Viumi',                                   'regular', 'egresos', false, false),
  ('42010209',  'Seguro por Traslado de Mercadería',                     'regular', 'egresos', false, false),
  ('420102101', 'Impuestos y tasas Importación',                         'regular', 'egresos', false, false),
  ('420102102', 'Comisiones Financieras',                                'regular', 'egresos', false, false),
  ('420102103', 'Impuesto al Sello de Santa Fe',                         'regular', 'egresos', false, false),
  ('42010215',  'Alquiler depósito',                                     'regular', 'egresos', false, false),
  ('42010216',  'Marketing',                                             'regular', 'egresos', false, false),
  ('42010217',  'Cadetería',                                             'regular', 'egresos', false, false),
  ('42010218',  'Comisiones Reparaciones Servicio Técnico',              'regular', 'egresos', false, false),
  ('42010219',  'Comisiones TC Getnet',                                  'regular', 'egresos', false, false),
  ('42010220',  'Comisiones TC Nave',                                    'regular', 'egresos', false, false),
  ('42010221',  'Gasto Financiero x Adel. Cheques',                      'regular', 'egresos', false, false),
  ('42010222',  'Comisiones ML',                                         'regular', 'egresos', false, false),
  ('42010223',  'Depósito por Importación',                              'regular', 'egresos', false, false),

  -- ── GASTOS SERVICIO TÉCNICO ───────────────────────────────────────────────
  ('51010101', 'Sueldos servicio técnico',                               'regular', 'egresos', false, false),
  ('51010102', 'Aguinaldo Servicio Técnico',                             'regular', 'egresos', false, false),
  ('51010103', 'Premios Servicio Técnico',                               'regular', 'egresos', false, false),
  ('51010104', 'Servicio Técnico Tercerizado',                           'regular', 'egresos', false, false),
  ('51010105', 'Viaticos Servicio Técnico',                              'regular', 'egresos', false, false),
  ('51010106', 'Cargas Sociales Servicio Técnico',                       'regular', 'egresos', false, false),
  ('51010107', 'Obra Social diferencial Servicio Técnico',               'regular', 'egresos', false, false),
  ('51010108', 'ICS/MICROCHIPS/HERRAMIENTAS',                            'regular', 'egresos', false, false),
  ('51010109', 'Insumos servicio técnico',                               'regular', 'egresos', false, false),
  ('51010110', 'Gastos Capacitaciones Servicio Técnico',                 'regular', 'egresos', false, false),
  ('51010111', 'Indemnizaciones',                                        'regular', 'egresos', false, false),
  ('51010112', 'Gratificacion Extraordinaria Renuncias',                 'regular', 'egresos', false, false),
  ('51010113', 'Acuerdos Homologados y Juicios Laborales',               'regular', 'egresos', false, false),
  ('51010114', 'Gastos Juicios Laborales',                               'regular', 'egresos', false, false),
  ('51010115', 'Cargas sociales servicio técnico',                       'regular', 'egresos', false, false),
  ('51010201', 'Bajas por Deterioro y Roturas',                          'regular', 'egresos', false, false),
  ('51010202', 'Baja por Obsoleto',                                      'regular', 'egresos', false, false),

  -- ── GASTOS MARKETING ──────────────────────────────────────────────────────
  ('52010101', 'Asociación Cámaras',                                     'regular', 'egresos', false, false),
  ('52010102', 'Merchandising & Aceleradores',                           'regular', 'egresos', false, false),
  ('52010103', 'Regalos Empresariales',                                  'regular', 'egresos', false, false),
  ('52010104', 'Publicidad ML',                                          'regular', 'egresos', false, false),
  ('52010105', 'Pauta Radio',                                            'regular', 'egresos', false, false),
  ('52010106', 'Pauta Gráfica',                                          'regular', 'egresos', false, false),
  ('52010107', 'Otras pautas web',                                       'regular', 'egresos', false, false),
  ('52010108', 'Pauta Meta',                                             'regular', 'egresos', false, false),
  ('52010109', 'Pauta Google Ads',                                       'regular', 'egresos', false, false),
  ('52010110', 'Pauta Mercado Libre',                                    'regular', 'egresos', false, false),
  ('52010111', 'Pauta Youtube',                                          'regular', 'egresos', false, false),
  ('52010112', 'Cartelerías',                                            'regular', 'egresos', false, false),
  ('52010113', 'Imprenta e Impresiones',                                 'regular', 'egresos', false, false),
  ('52010114', 'Videos Marketing',                                       'regular', 'egresos', false, false),
  ('52010115', 'Gastos Capacitaciones Marketing',                        'regular', 'egresos', false, false),

  -- ── GASTOS COMERCIALIZACIÓN ───────────────────────────────────────────────
  ('52010116', 'Beneficios a Clientes',                                  'regular', 'egresos', false, false),
  ('52010117', 'Viáticos Comercialización',                              'regular', 'egresos', false, false),
  ('52010118', 'Viajes Comerciales',                                     'regular', 'egresos', false, false),
  ('52010119', 'Peajes',                                                 'regular', 'egresos', false, false),
  ('52010201', 'Sueldos Marketing',                                      'regular', 'egresos', false, false),
  ('52010202', 'Aguinaldo Marketing',                                    'regular', 'egresos', false, false),
  ('52010203', 'Sueldos Comercialización',                               'regular', 'egresos', false, false),
  ('52010204', 'Cargas Sociales Comercialización',                       'regular', 'egresos', false, false),
  ('52010205', 'Aguinaldo Comercialización',                             'regular', 'egresos', false, false),
  ('52010206', 'Premios Comercialización',                               'regular', 'egresos', false, false),
  ('52010207', 'INACAP',                                                 'regular', 'egresos', false, false),
  ('52010208', 'FAECYS',                                                 'regular', 'egresos', false, false),
  ('52010209', 'AEC',                                                    'regular', 'egresos', false, false),
  ('52010210', 'OSECAC',                                                 'regular', 'egresos', false, false),
  ('52010211', 'SUSS',                                                   'regular', 'egresos', false, false),
  ('52010212', 'Exam. Preocupacionales',                                 'regular', 'egresos', false, false),
  ('52010301', 'Seguro Robo Computadoras',                               'regular', 'egresos', false, false),
  ('52010302', 'Seguro Mercaderías',                                     'regular', 'egresos', false, false),

  -- ── GASTOS DE ADMINISTRACIÓN ──────────────────────────────────────────────
  ('53010101', 'Legal',                                                  'regular', 'egresos', false, false),
  ('53010102', 'Recursos Humanos',                                       'regular', 'egresos', false, false),
  ('53010103', 'Honorarios Profesionales Administración',                'regular', 'egresos', false, false),
  ('53010104', 'Auditoria Externa y Dictámenes',                         'regular', 'egresos', false, false),
  ('53010105', 'Consultoria Sistemas',                                   'regular', 'egresos', false, false),
  ('53010106', 'Balance',                                                'regular', 'egresos', false, false),
  ('53010107', 'Suscripciones',                                          'regular', 'egresos', false, false),
  ('53010108', 'Servicio de Consultoría',                                'regular', 'egresos', false, false),
  ('53010109', 'Certificaciones y Legalización',                         'regular', 'egresos', false, false),
  ('53010201', 'Alquiler Oficina',                                       'regular', 'egresos', false, false),
  ('53010202', 'Amortizaciones Edificios',                               'regular', 'egresos', false, false),
  ('53010203', 'Amortizaciones Mejoras',                                 'regular', 'egresos', false, false),
  ('53010204', 'Mantenimiento de Inmuebles',                             'regular', 'egresos', false, false),
  ('53010205', 'Seguro Comercio',                                        'regular', 'egresos', false, false),
  ('53010301', 'Alquileres Muebles y Utiles',                            'regular', 'egresos', false, false),
  ('53010302', 'Seguro Incendio Muebles y Utiles',                       'regular', 'egresos', false, false),
  ('53010303', 'Amortizaciones Muebles y Utiles',                        'regular', 'egresos', false, false),
  ('53010304', 'Mantenimiento Muebles y Utiles',                         'regular', 'egresos', false, false),
  ('53010305', 'Alquiler Cochera',                                       'regular', 'egresos', false, false),
  ('53010401', 'Amortizaciones Computadoras',                            'regular', 'egresos', false, false),
  ('53010402', 'Amortizaciones Software',                                'regular', 'egresos', false, false),
  ('53010403', 'Mantenimiento Computadoras',                             'regular', 'egresos', false, false),
  ('53010404', 'Mantenimiento Software',                                 'regular', 'egresos', false, false),
  ('53010405', 'Servicios de IT de Terceros',                            'regular', 'egresos', false, false),
  ('53010406', 'Alquiler de Servidores',                                 'regular', 'egresos', false, false),
  ('53010501', 'Seguro Rodados',                                         'regular', 'egresos', false, false),
  ('53010502', 'Patentes Automotor',                                     'regular', 'egresos', false, false),
  ('53010503', 'Gastos Rodados',                                         'regular', 'egresos', false, false),
  ('53010504', 'Amortizaciones Rodados',                                 'regular', 'egresos', false, false),
  ('53010505', 'Mantenimiento Rodados',                                  'regular', 'egresos', false, false),
  ('53010506', 'Multas Tránsito',                                        'regular', 'egresos', false, false),
  ('53010507', 'Combustible Rodados',                                    'regular', 'egresos', false, false),
  ('53010601', 'Deudores Incobrables',                                   'regular', 'egresos', false, false),
  ('53010701', 'Gastos Bancarios',                                       'regular', 'egresos', false, false),
  ('53010702', 'Diferencias de Caja',                                    'regular', 'egresos', false, false),
  ('53010703', 'Billetes Falsos',                                        'regular', 'egresos', false, false),
  ('53010704', 'Alquiler Cajas de Seguridad',                            'regular', 'egresos', false, false),
  ('53010705', 'Impuesto al Débito Bancario',                            'regular', 'egresos', false, false),
  ('53010706', 'Impuesto al Crédito Bancario',                           'regular', 'egresos', false, false),
  ('53010801', 'Gastos Librería',                                        'regular', 'egresos', false, false),
  ('53010802', 'Gastos Limpieza',                                        'regular', 'egresos', false, false),
  ('53010803', 'Gastos de Oficina',                                      'regular', 'egresos', false, false),
  ('53010804', 'Viaticos Administración',                                'regular', 'egresos', false, false),
  ('53010901', 'Sueldos Administración',                                 'regular', 'egresos', false, false),
  ('53010902', 'Cargas Sociales Administración',                         'regular', 'egresos', false, false),
  ('53010903', 'Aguinaldo Administración',                               'regular', 'egresos', false, false),
  ('53010904', 'Premios Administración',                                 'regular', 'egresos', false, false),
  ('53010905', 'Gastos Capacitacion Administración',                     'regular', 'egresos', false, false),
  ('53010906', 'Sueldos Administración (Gerencial)',                     'regular', 'egresos', false, false),
  ('53010907', 'Aguinaldo Administración (Gerencial)',                   'regular', 'egresos', false, false),

  -- ── GASTOS SOBRE MARCAS, PROTECCIÓN, SERVICIOS, INSUMOS E INSTITUCIONALES
  ('54010401', 'Amortizaciones Marcas y Patentes',                       'regular', 'egresos', false, false),
  ('54010501', 'Certificación de Normas Valor',                          'regular', 'egresos', false, false),
  ('54010502', 'Certificación de Normas Amortizaciones',                 'regular', 'egresos', false, false),
  ('55010101', 'Abono Alarmas',                                          'regular', 'egresos', false, false),
  ('55010102', 'Software y Hardware Alarmas',                            'regular', 'egresos', false, false),
  ('56010101', 'Internet y telefonía',                                   'regular', 'egresos', false, false),
  ('56010102', 'Hosting de Terceros',                                    'regular', 'egresos', false, false),
  ('56010201', 'Suministro Electricidad',                                'regular', 'egresos', false, false),
  ('56010202', 'Suministro Agua',                                        'regular', 'egresos', false, false),
  ('56010203', 'Suministro Gas',                                         'regular', 'egresos', false, false),
  ('57010101', 'Insumos de Computación',                                 'regular', 'egresos', false, false),
  ('57010201', 'Papeleria y Utiles',                                     'regular', 'egresos', false, false),
  ('58010101', 'Honorarios Socios Gerentes',                             'regular', 'egresos', false, false),
  ('58010102', 'Gratificaciones Extraordinarias Directores',             'regular', 'egresos', false, false),
  ('58010103', 'Multas Fiscales / Seg. Sociales',                        'regular', 'egresos', false, false),

  -- ── GASTOS DE FINANCIACIÓN E IMPOSITIVOS ─────────────────────────────────
  ('59010101', 'Costo Financiero Payway',                                'regular', 'egresos', false, false),
  ('59010102', 'Intereses s/ Descubierto',                               'regular', 'egresos', false, false),
  ('59110101', 'Impuesto a los Ingresos Brutos',                         'regular', 'egresos', false, false),
  ('59110102', 'DREI',                                                   'regular', 'egresos', false, false),
  ('59110103', 'Expensas Oficina',                                       'regular', 'egresos', false, false),
  ('59110104', 'IIBB',                                                   'regular', 'egresos', false, false),
  ('59110105', 'I.V.A Posición Mensual',                                 'regular', 'egresos', false, false),
  ('59110106', 'Impuesto a los Bienes Personales',                       'regular', 'egresos', false, false),
  ('59110107', 'Impuesto a las Ganancias',                               'regular', 'egresos', false, false),
  ('59110108', 'Impuesto Inmobiliario',                                  'regular', 'egresos', false, false),
  ('59110109', 'TGI',                                                    'regular', 'egresos', false, false),

  -- ── RESULTADOS FINANCIEROS - GENERADOS POR ACTIVOS ───────────────────────
  ('61010104', 'Intereses Ganados por Plazos Fijos',                     'regular', 'ingresos', false, false),
  ('61010105', 'Intereses Bursátiles ganados (TSA)',                     'regular', 'ingresos', false, false),
  ('61010107', 'Rentas Bursátiles Ganadas',                              'regular', 'ingresos', false, false),
  ('61010108', 'Intereses ganados',                                      'regular', 'ingresos', false, false),
  ('61010109', 'Ingresos por Financiacion Tarjetas',                     'regular', 'ingresos', false, false),
  ('61010110', 'Intereses Financiación Clientes',                        'regular', 'ingresos', false, false),
  ('61010301', 'Resultado por Exposición a la Inflación Activa',         'regular', 'ingresos', false, false),
  ('61010401', 'Resultado por Tenencia',                                 'regular', 'ingresos', false, false),

  -- ── RESULTADOS FINANCIEROS - GENERADOS POR PASIVOS ───────────────────────
  -- NOTA: 62010201 "Diferencia de Cambio" es la ÚNICA cuenta para diferencias
  -- de cambio en cuentas corrientes (confirmado por Leandro D'Almeida).
  -- HABER = ganancia de cambio / DEBE = pérdida de cambio.
  ('62010101', 'Intereses Financiación Proveedores',                     'regular', 'egresos', false, false),
  ('62010103', 'Intereses Préstamos Bancarios Recibidos',                'regular', 'egresos', false, false),
  ('62010104', 'Ajuste Retenciones y Percepciones',                      'regular', 'egresos', false, false),
  ('62010106', 'Intereses S/ deudas Fiscales y Sociales',                'regular', 'egresos', false, false),
  ('62010107', 'Intereses Otros Préstamos Financieros',                  'regular', 'egresos', false, false),
  ('62010108', 'Intereses Descubierto Bancario',                         'regular', 'egresos', false, false),
  ('62010110', 'Intereses s/ Impuestos',                                 'regular', 'egresos', false, false),
  ('62010201', 'Diferencia de Cambio',                                   'regular', 'egresos', false, false),
  ('62010301', 'Resultado por Exposición a la Inflación Pasiva',         'regular', 'egresos', false, false),

  -- ── OTROS INGRESOS Y EGRESOS ──────────────────────────────────────────────
  ('71010101', 'Ventas bienes de uso',                                   'regular', 'ingresos', false, false),
  ('71010102', 'Otros Ingresos no Operativos',                           'regular', 'ingresos', false, false),
  ('72010101', 'Costo Ventas Bienes de Uso',                             'regular', 'egresos',  false, false),

  -- ── IMPUESTO A LAS GANANCIAS ──────────────────────────────────────────────
  ('81010101', 'Provisión Impuesto a las Ganancias',                     'regular', 'egresos', false, false),
  ('81010102', 'Impuesto a las Ganancias',                               'regular', 'egresos', false, false),

  -- ── CUENTAS PUENTE ────────────────────────────────────────────────────────
  ('99999997', 'Cuenta Puente Para Prestamos',                           'regular', 'puente', false, true),
  ('99999998', 'Cuenta Puente para Movimientos Bancarios',               'regular', 'puente', false, true),
  ('99999999', 'Cuenta Puente entre Diarios',                            'regular', 'puente', false, true)
)
INSERT INTO contabilidad_plan_cuentas (
  codigo,
  nombre,
  tipo_interno,
  tipo_cuenta_id,
  permite_conciliacion,
  es_cuenta_puente,
  activo
)
SELECT
  c.codigo,
  c.nombre,
  c.tipo_interno,
  t.id,
  c.permite_conciliacion,
  c.es_cuenta_puente,
  true
FROM cuentas c
JOIN contabilidad_tipos_cuenta t ON t.codigo = c.tipo_cuenta_cod
ON CONFLICT (codigo) DO NOTHING;

-- ─── Verificación ─────────────────────────────────────────────────────────────
-- Ejecutar para confirmar:
-- SELECT COUNT(*) FROM contabilidad_plan_cuentas;  -- debe ser 351
-- SELECT tipo_cuenta_cod, COUNT(*) FROM (
--   SELECT t.codigo AS tipo_cuenta_cod FROM contabilidad_plan_cuentas p
--   JOIN contabilidad_tipos_cuenta t ON t.id = p.tipo_cuenta_id
-- ) x GROUP BY tipo_cuenta_cod ORDER BY tipo_cuenta_cod;
