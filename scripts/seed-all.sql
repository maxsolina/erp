-- ============================================================
-- SEED COMPLETO - Cell Home ERP
-- ============================================================

-- 1. SUCURSALES
INSERT INTO sucursales (id, codigo, nombre, direccion, telefono, activa) VALUES
  (1, 'PN', 'Puerto Norte', 'Av. Wheelwright 1000, Rosario', '0341-4000000', true),
  (2, 'SU', 'Sucursal 2', 'Av. Pellegrini 1234, Rosario', '0341-4000001', true)
ON CONFLICT (id) DO NOTHING;

-- 2. VENDEDORES
INSERT INTO vendedores (id, codigo, nombre, email, sucursal_id, activo) VALUES
  (1, 'V001', 'Maximiliano Solina', 'max@cellhome.com.ar', 1, true),
  (2, 'V002', 'Carla Gómez', 'carla@cellhome.com.ar', 1, true),
  (3, 'V003', 'Rodrigo Pérez', 'rodrigo@cellhome.com.ar', 2, true),
  (4, 'V004', 'Laura Martínez', 'laura@cellhome.com.ar', 1, true)
ON CONFLICT (id) DO NOTHING;

-- 3. TARJETAS
INSERT INTO tarjetas (id, nombre, tipo, recargo_pct, activa) VALUES
  (1, 'Visa', 'credito', 0, true),
  (2, 'Mastercard', 'credito', 0, true),
  (3, 'American Express', 'credito', 5, true),
  (4, 'Cabal', 'credito', 0, true),
  (5, 'Naranja', 'credito', 0, true),
  (6, 'Visa Débito', 'debito', 0, true),
  (7, 'Mastercard Débito', 'debito', 0, true)
ON CONFLICT (id) DO NOTHING;

-- 4. TARJETA_CUOTAS
INSERT INTO tarjeta_cuotas (id, tarjeta_id, cuotas, recargo_pct) VALUES
  (1,  1, 1, 0), (2,  1, 3, 0), (3,  1, 6, 12), (4,  1, 12, 25), (5,  1, 18, 40),
  (6,  2, 1, 0), (7,  2, 3, 0), (8,  2, 6, 12), (9,  2, 12, 25), (10, 2, 18, 40),
  (11, 3, 1, 5), (12, 3, 3, 10),(13, 3, 6, 20),
  (14, 4, 1, 0), (15, 4, 3, 0), (16, 4, 6, 10), (17, 4, 12, 22),
  (18, 5, 1, 0), (19, 5, 3, 0), (20, 5, 6, 10), (21, 5, 12, 22),
  (22, 6, 1, 0),
  (23, 7, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- 5. LISTAS DE PRECIOS
INSERT INTO listas_precios (id, nombre, moneda, activa) VALUES
  (1, 'Lista Minorista',   'ARS', true),
  (2, 'Lista Mayorista',   'ARS', true),
  (3, 'Lista Distribuidor','ARS', true),
  (4, 'Lista Dólar',       'USD', true)
ON CONFLICT (id) DO NOTHING;

-- 6. CATEGORÍAS DE PRODUCTO
INSERT INTO categorias_producto (id, nombre, descripcion) VALUES
  (1, 'Celulares',        'Smartphones y teléfonos móviles'),
  (2, 'Tablets',          'Tablets y iPads'),
  (3, 'Accesorios',       'Fundas, protectores, cables y más'),
  (4, 'Audio',            'Auriculares, parlantes y accesorios de audio'),
  (5, 'Smartwatches',     'Relojes inteligentes y wearables'),
  (6, 'Computación',      'Notebooks, PCs y accesorios'),
  (7, 'Cámaras',          'Cámaras de fotos y video'),
  (8, 'Repuestos',        'Repuestos y partes'),
  (9, 'Servicio Técnico', 'Mano de obra y servicios')
ON CONFLICT (id) DO NOTHING;

-- 7. PRODUCTOS
INSERT INTO productos (id, codigo, nombre, descripcion, categoria_id, unidad_medida, precio_base, costo, stock, stock_minimo, activo) VALUES
  (1,  'CEL-IP15-128', 'iPhone 15 128GB', 'Apple iPhone 15 128GB Negro', 1, 'un', 1450000, 1100000, 12, 2, true),
  (2,  'CEL-IP15-256', 'iPhone 15 256GB', 'Apple iPhone 15 256GB Negro', 1, 'un', 1680000, 1280000, 8,  2, true),
  (3,  'CEL-SAM-S24',  'Samsung Galaxy S24', 'Samsung Galaxy S24 128GB', 1, 'un', 1200000, 900000,  15, 3, true),
  (4,  'CEL-SAM-A55',  'Samsung Galaxy A55', 'Samsung Galaxy A55 256GB', 1, 'un', 680000,  510000,  20, 5, true),
  (5,  'CEL-MOT-G84',  'Motorola Edge 40', 'Motorola Edge 40 256GB', 1, 'un', 520000,  390000,  18, 5, true),
  (6,  'CEL-XIA-13',   'Xiaomi 13', 'Xiaomi 13 Pro 256GB', 1, 'un', 890000,  670000,  10, 2, true),
  (7,  'TAB-IPAD-A9',  'iPad Air M2', 'Apple iPad Air M2 11" 128GB WiFi', 2, 'un', 980000,  740000,  6,  1, true),
  (8,  'TAB-SAM-S9',   'Samsung Galaxy Tab S9', 'Samsung Tab S9 128GB', 2, 'un', 750000,  565000,  5,  1, true),
  (9,  'ACC-FUNDA-01', 'Funda Silicona iPhone 15', 'Funda silicona premium iPhone 15', 3, 'un', 12000,   7000,   80, 10, true),
  (10, 'ACC-CABLE-01', 'Cable USB-C Lightning 1m', 'Cable trenzado USB-C a Lightning', 3, 'un', 8500,    4500,   150, 20, true),
  (11, 'ACC-CARG-01',  'Cargador 20W USB-C', 'Cargador rápido 20W USB-C', 3, 'un', 22000,   13000,  60, 10, true),
  (12, 'AUD-AUG-01',   'AirPods Pro 2da Gen', 'Apple AirPods Pro 2da generación', 4, 'un', 380000,  285000,  8,  2, true),
  (13, 'AUD-SAM-B2',   'Samsung Galaxy Buds2 Pro', 'Galaxy Buds2 Pro ANC', 4, 'un', 180000,  135000,  12, 3, true),
  (14, 'WAT-AW-S9',    'Apple Watch Series 9', 'Apple Watch Series 9 GPS 45mm', 5, 'un', 420000,  315000,  7,  2, true),
  (15, 'WAT-SAM-W6',   'Samsung Galaxy Watch 6', 'Galaxy Watch 6 44mm', 5, 'un', 280000,  210000,  9,  2, true),
  (16, 'REP-PANT-01',  'Pantalla iPhone 15', 'Pantalla OLED original iPhone 15', 8, 'un', 95000,   65000,   15, 3, true),
  (17, 'REP-BAT-01',   'Batería iPhone 14', 'Batería original iPhone 14', 8, 'un', 28000,   18000,   25, 5, true),
  (18, 'SVC-REPARO',   'Mano de Obra Reparación', 'Servicio técnico - mano de obra', 9, 'un', 15000,   0,       0,  0, true)
ON CONFLICT (id) DO NOTHING;

-- 8. LISTA_PRECIOS_ITEMS (precio de cada producto en cada lista)
INSERT INTO lista_precios_items (lista_id, producto_id, precio) VALUES
  -- Lista Minorista (1)
  (1,1,1450000),(1,2,1680000),(1,3,1200000),(1,4,680000),(1,5,520000),(1,6,890000),
  (1,7,980000),(1,8,750000),(1,9,12000),(1,10,8500),(1,11,22000),(1,12,380000),
  (1,13,180000),(1,14,420000),(1,15,280000),(1,16,95000),(1,17,28000),(1,18,15000),
  -- Lista Mayorista (2) - 15% descuento
  (2,1,1232500),(2,2,1428000),(2,3,1020000),(2,4,578000),(2,5,442000),(2,6,756500),
  (2,7,833000),(2,8,637500),(2,9,10200),(2,10,7225),(2,11,18700),(2,12,323000),
  (2,13,153000),(2,14,357000),(2,15,238000),(2,16,80750),(2,17,23800),(2,18,12750),
  -- Lista Distribuidor (3) - 25% descuento
  (3,1,1087500),(3,2,1260000),(3,3,900000),(3,4,510000),(3,5,390000),(3,6,667500),
  (3,7,735000),(3,8,562500),(3,9,9000),(3,10,6375),(3,11,16500),(3,12,285000),
  (3,13,135000),(3,14,315000),(3,15,210000),(3,16,71250),(3,17,21000),(3,18,11250),
  -- Lista Dólar (4) - precios en USD
  (4,1,1450),(4,2,1680),(4,3,1200),(4,4,680),(4,5,520),(4,6,890),
  (4,7,980),(4,8,750),(4,9,12),(4,10,9),(4,11,22),(4,12,380),
  (4,13,180),(4,14,420),(4,15,280),(4,16,95),(4,17,28),(4,18,15)
ON CONFLICT DO NOTHING;

-- 9. NOTAS DE VENTA (con cliente_id=1 que ya existe)
INSERT INTO notas_venta (id, numero, cliente_id, vendedor_id, sucursal_id, fecha, estado, moneda, total) VALUES
  (1, 'NV-0001', 1, 1, 1, '2026-03-10 10:30:00+00', 'facturada', 'ARS', 1450000),
  (2, 'NV-0002', 1, 2, 1, '2026-03-15 14:00:00+00', 'pendiente', 'ARS', 680000),
  (3, 'NV-0003', 1, 1, 1, '2026-03-20 09:15:00+00', 'pendiente', 'ARS', 542500)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notas_venta_lineas (id, nota_venta_id, producto_id, producto_nombre, cantidad, precio_unitario, descuento, subtotal) VALUES
  (1, 1, 1, 'iPhone 15 128GB', 1, 1450000, 0, 1450000),
  (2, 2, 4, 'Samsung Galaxy A55', 1, 680000, 0, 680000),
  (3, 3, 5, 'Motorola Edge 40', 1, 520000, 0, 520000),
  (4, 3, 9, 'Funda Silicona iPhone 15', 1, 12000, 10, 10800),
  (5, 3, 10, 'Cable USB-C Lightning 1m', 1, 8500, 10, 7650),
  (6, 3, 11, 'Cargador 20W USB-C', 2, 22000, 10, 39600)
ON CONFLICT (id) DO NOTHING;

-- 10. FACTURAS
INSERT INTO facturas (id, numero, tipo, nota_venta_id, nota_venta_numero, cliente_id, cliente_nombre, vendedor_id, vendedor_nombre, sucursal_id, sucursal, fecha, estado, moneda, subtotal, descuento, impuestos, total, saldo, termino_pago, condicion_pago) VALUES
  (1, 'FA-A-00001', 'A', 1, 'NV-0001', 1, 'Max Solina', 1, 'Maximiliano Solina', 1, 'Puerto Norte', '2026-03-10 10:30:00+00', 'cobrada', 'ARS', 1450000, 0, 0, 1450000, 0, 'Contado Efectivo', 'contado'),
  (2, 'FA-B-00001', 'B', null, null, 1, 'Max Solina', 2, 'Carla Gómez', 1, 'Puerto Norte', '2026-03-18 11:00:00+00', 'pendiente', 'ARS', 1200000, 0, 0, 1200000, 1200000, 'Cuenta Corriente', 'cuenta_corriente')
ON CONFLICT (id) DO NOTHING;

INSERT INTO facturas_lineas (id, factura_id, producto_id, producto_nombre, cantidad, precio_unitario, descuento, subtotal) VALUES
  (1, 1, 1, 'iPhone 15 128GB', 1, 1450000, 0, 1450000),
  (2, 2, 3, 'Samsung Galaxy S24', 1, 1200000, 0, 1200000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO facturas_vencimientos (id, factura_id, descripcion, fecha, total) VALUES
  (1, 1, 'Pago único', '2026-03-10', 1450000),
  (2, 2, 'Vencimiento 30 días', '2026-04-18', 1200000)
ON CONFLICT (id) DO NOTHING;

-- 11. RECIBOS
INSERT INTO recibos (id, numero, cliente_id, cliente_nombre, vendedor_id, sucursal_id, fecha, estado, moneda, importe_total, importe_no_conciliado) VALUES
  (1, 'RC-00001', 1, 'Max Solina', 1, 1, '2026-03-10 10:35:00+00', 'conciliado', 'ARS', 1450000, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO recibos_lineas (id, recibo_id, medio, descripcion, monto_original, monto_con_recargo) VALUES
  (1, 1, 'efectivo', 'Pago en efectivo', 1450000, 1450000)
ON CONFLICT (id) DO NOTHING;

-- 12. MOVIMIENTOS CUENTA CORRIENTE
INSERT INTO movimientos_cuenta_corriente (id, cliente_id, fecha, tipo, concepto, documento_tipo, documento_numero, documento_id, moneda, importe, saldo_posterior) VALUES
  (1, 1, '2026-03-10 10:30:00+00', 'debito',  'Factura FA-A-00001', 'factura', 'FA-A-00001', 1, 'ARS', 1450000, 1450000),
  (2, 1, '2026-03-10 10:35:00+00', 'credito', 'Recibo RC-00001',    'recibo',  'RC-00001',   1, 'ARS', 1450000, 0),
  (3, 1, '2026-03-18 11:00:00+00', 'debito',  'Factura FA-B-00001', 'factura', 'FA-B-00001', 2, 'ARS', 1200000, 1200000)
ON CONFLICT (id) DO NOTHING;

-- Actualizar sequences para que el próximo INSERT use el ID correcto
SELECT setval('sucursales_id_seq', (SELECT MAX(id) FROM sucursales));
SELECT setval('vendedores_id_seq', (SELECT MAX(id) FROM vendedores));
SELECT setval('tarjetas_id_seq', (SELECT MAX(id) FROM tarjetas));
SELECT setval('tarjeta_cuotas_id_seq', (SELECT MAX(id) FROM tarjeta_cuotas));
SELECT setval('listas_precios_id_seq', (SELECT MAX(id) FROM listas_precios));
SELECT setval('categorias_producto_id_seq', (SELECT MAX(id) FROM categorias_producto));
SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));
SELECT setval('notas_venta_id_seq', (SELECT MAX(id) FROM notas_venta));
SELECT setval('notas_venta_lineas_id_seq', (SELECT MAX(id) FROM notas_venta_lineas));
SELECT setval('facturas_id_seq', (SELECT MAX(id) FROM facturas));
SELECT setval('facturas_lineas_id_seq', (SELECT MAX(id) FROM facturas_lineas));
SELECT setval('facturas_vencimientos_id_seq', (SELECT MAX(id) FROM facturas_vencimientos));
SELECT setval('recibos_id_seq', (SELECT MAX(id) FROM recibos));
SELECT setval('recibos_lineas_id_seq', (SELECT MAX(id) FROM recibos_lineas));
SELECT setval('movimientos_cuenta_corriente_id_seq', (SELECT MAX(id) FROM movimientos_cuenta_corriente));
