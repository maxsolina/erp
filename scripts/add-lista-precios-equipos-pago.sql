-- ============================================================
-- Agregar Lista de Precios: Equipos en Parte de Pago
-- ============================================================

-- Insertar la nueva lista de precios
INSERT INTO listas_precios (id, nombre, moneda, activa) VALUES
  (5, 'Equipos en Parte de Pago', 'ARS', true)
ON CONFLICT (id) DO NOTHING;

-- Opcional: Si deseas agregar precios específicos para productos en esta lista
-- Descomenta las líneas siguientes y ajusta según tus necesidades:
/*
INSERT INTO lista_precios_items (lista_id, producto_id, precio) VALUES
  -- Equipos de alto valor con modalidad de pago en cuotas
  (5, 1,  1450000),  -- iPhone 15 128GB
  (5, 2,  1680000),  -- iPhone 15 256GB
  (5, 3,  1200000),  -- Samsung Galaxy S24
  (5, 7,  980000),   -- iPad Air M2
  (5, 8,  750000),   -- Samsung Galaxy Tab S9
  (5, 12, 380000),   -- AirPods Pro 2da Gen
  (5, 14, 420000)    -- Apple Watch Series 9
ON CONFLICT DO NOTHING;
*/
