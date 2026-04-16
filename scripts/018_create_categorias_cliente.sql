-- ============================================================================
-- 018_create_categorias_cliente.sql
-- Tabla propia de categorías de clientes (separada de categorias_proveedor).
-- Migra el campo texto `clientes.categoria` a FK numérica `clientes.categoria_id`.
-- IDEMPOTENTE
-- ============================================================================

-- 1. Tabla categorias_cliente
CREATE TABLE IF NOT EXISTS categorias_cliente (
  id                      SERIAL PRIMARY KEY,
  nombre                  VARCHAR(100) NOT NULL UNIQUE,
  descripcion             TEXT,
  lista_precios_defecto_id INTEGER REFERENCES listas_precios(id) ON DELETE SET NULL,
  cuenta_cobrar_id        UUID REFERENCES contabilidad_plan_cuentas(id) ON DELETE SET NULL,
  activa                  BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed: categorías base
INSERT INTO categorias_cliente (nombre, descripcion, cuenta_cobrar_id)
VALUES
  ('Público General',  'Clientes minoristas - mostrador',
    (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11030101' LIMIT 1)),
  ('MercadoLibre',     'Clientes canal MercadoLibre',
    (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11030101' LIMIT 1)),
  ('Mayorista',        'Clientes mayoristas / distribuidores',
    (SELECT id FROM contabilidad_plan_cuentas WHERE codigo = '11030101' LIMIT 1))
ON CONFLICT (nombre) DO NOTHING;

-- 3. Agregar categoria_id a clientes (FK a la nueva tabla)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS categoria_id INTEGER
    REFERENCES categorias_cliente(id) ON DELETE SET NULL;

-- 4. Asignar Público General a todos los clientes sin categoría asignada
UPDATE clientes
SET categoria_id = (SELECT id FROM categorias_cliente WHERE nombre = 'Público General' LIMIT 1)
WHERE categoria_id IS NULL;

-- 5. Verificación
SELECT cc.nombre AS categoria, COUNT(c.id) AS cantidad_clientes
FROM categorias_cliente cc
LEFT JOIN clientes c ON c.categoria_id = cc.id
GROUP BY cc.id, cc.nombre
ORDER BY cc.nombre;
