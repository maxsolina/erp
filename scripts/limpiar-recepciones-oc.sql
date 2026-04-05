-- Limpiar todas las recepciones y órdenes de compra
-- ADVERTENCIA: Esta operación es irreversible

-- Primero las recepciones (pueden tener FK hacia OC)
DELETE FROM recepciones;

-- Luego las líneas de órdenes de compra si existen como tabla separada
DELETE FROM orden_compra_lineas;

-- Finalmente las órdenes de compra
DELETE FROM ordenes_compra;
