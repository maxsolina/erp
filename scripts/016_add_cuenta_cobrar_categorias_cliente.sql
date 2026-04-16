-- ============================================================================
-- 016_add_cuenta_cobrar_categorias_cliente.sql
-- Agrega cuenta_cobrar_id a categorias_proveedor (usada como categoría de cliente)
-- para determinar la cuenta contable DEBE en asientos de facturas de venta.
-- Patrón Odoo: cada categoría de cliente tiene su propia "Cuenta a cobrar por defecto".
-- IDEMPOTENTE: ADD COLUMN IF NOT EXISTS
-- ============================================================================

ALTER TABLE categorias_proveedor
  ADD COLUMN IF NOT EXISTS cuenta_cobrar_id UUID
    REFERENCES contabilidad_plan_cuentas(id) ON DELETE SET NULL;

-- Seed: asignar 11030101 (Deudores por Ventas) a todas las categorías marcadas
-- como disponible_clientes = TRUE, solo si aún no tienen cuenta asignada.
UPDATE categorias_proveedor
SET cuenta_cobrar_id = (
  SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11030101' LIMIT 1
)
WHERE disponible_clientes = TRUE
  AND cuenta_cobrar_id IS NULL;

-- Verificación
SELECT id, nombre, disponible_clientes, cuenta_cobrar_id,
       (SELECT codigo FROM contabilidad_plan_cuentas WHERE id = cuenta_cobrar_id) AS cuenta_cobrar_codigo
FROM categorias_proveedor
WHERE disponible_clientes = TRUE
ORDER BY nombre;
