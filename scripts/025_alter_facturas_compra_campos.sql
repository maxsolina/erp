-- 025_alter_facturas_compra_campos.sql
-- Agrega columnas faltantes y corrige constraints en facturas_compra

-- Columnas financieras adicionales
ALTER TABLE public.facturas_compra
  ADD COLUMN IF NOT EXISTS impuestos       NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moneda          TEXT NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS tipo_cambio     TEXT,
  ADD COLUMN IF NOT EXISTS orden_compra_id INTEGER REFERENCES public.ordenes_compra(id);

-- Corregir el CHECK de estado para incluir 'borrador' y 'publicada'
ALTER TABLE public.facturas_compra
  DROP CONSTRAINT IF EXISTS facturas_compra_estado_check;

ALTER TABLE public.facturas_compra
  ADD CONSTRAINT facturas_compra_estado_check
  CHECK (estado IN ('borrador','pendiente','publicada','pagada','vencida','cancelada'));

-- Corregir el CHECK de tipo para incluir todos los tipos del sistema
ALTER TABLE public.facturas_compra
  DROP CONSTRAINT IF EXISTS facturas_compra_tipo_check;

ALTER TABLE public.facturas_compra
  ADD CONSTRAINT facturas_compra_tipo_check
  CHECK (tipo IN ('A','B','C','E','NC-A','NC-B','NC-C','Ticket','Recibo'));
