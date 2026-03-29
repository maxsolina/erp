-- Crear tabla de categorías de proveedor
CREATE TABLE IF NOT EXISTS categorias_proveedor (
  id                          BIGSERIAL PRIMARY KEY,
  nombre                      TEXT NOT NULL,
  disponible_clientes         BOOLEAN NOT NULL DEFAULT FALSE,
  disponible_proveedores      BOOLEAN NOT NULL DEFAULT TRUE,
  tipo_control                TEXT NOT NULL DEFAULT 'Ninguno',
  cuenta_cobrar_defecto       TEXT NOT NULL DEFAULT '',
  cuenta_pagar_defecto        TEXT NOT NULL DEFAULT '',
  requiere_oc_para_facturar   BOOLEAN NOT NULL DEFAULT FALSE,
  comprobantes_confidenciales BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vaciar e insertar categorías según la imagen
TRUNCATE categorias_proveedor RESTART IDENTITY;

INSERT INTO categorias_proveedor (nombre, disponible_clientes, disponible_proveedores) VALUES
  ('Otros Proveedores - Sin Clasificar (c/ dudas)', FALSE, TRUE),
  ('Importador',                     FALSE, TRUE),
  ('Empleados',                      FALSE, TRUE),
  ('Servicio Técnico Tercerizado',   FALSE, TRUE),
  ('Equipos en consignación',        FALSE, TRUE),
  ('Servicios',                      FALSE, TRUE),
  ('Prestamos en USD',               FALSE, TRUE),
  ('Préstamos Temporarios',          FALSE, TRUE),
  ('Bancos y Entidades Foieras.',    FALSE, TRUE),
  ('Proveedores de Bienes de Uso (Activos)', FALSE, TRUE),
  ('Equipos de Cells Home',          TRUE,  TRUE),
  ('Infraestructura',                FALSE, TRUE),
  ('Varios',                         TRUE,  TRUE),
  ('Impuestos',                      TRUE,  TRUE),
  ('Logística',                      TRUE,  TRUE),
  ('Logistica Internacional',        FALSE, TRUE),
  ('Proveedores Nacionales V',       FALSE, TRUE),
  ('Proveedores Nacionales NV',      FALSE, TRUE),
  ('Proveedores Internacionales V',  FALSE, TRUE),
  ('Proveedores Internacionales NV', FALSE, TRUE),
  ('Deudas Sindicales (AEC)',        FALSE, TRUE),
  ('Deudas Sindicales (FAECYS)',     FALSE, TRUE),
  ('Deudas Sindicales (OSECAC)',     FALSE, TRUE),
  ('Deudas Sindicales (INACAP)',     FALSE, TRUE),
  ('Comisionistas',                  FALSE, TRUE),
  ('ARCA - IVA',                     FALSE, TRUE),
  ('ARCA - SUSS',                    FALSE, TRUE),
  ('ARCA - Imp. BS Personales',      FALSE, TRUE),
  ('DREI',                           FALSE, TRUE),
  ('ARCA - Imp. a las Ganancias',    FALSE, TRUE),
  ('IIBB',                           FALSE, TRUE),
  ('Prestamos Bancarios',            FALSE, TRUE),
  ('Servicios NV',                   FALSE, TRUE),
  ('Impuesto Inmobiliario',          FALSE, TRUE),
  ('TGI',                            FALSE, TRUE),
  ('ARCA - IIBB',                    FALSE, TRUE);
