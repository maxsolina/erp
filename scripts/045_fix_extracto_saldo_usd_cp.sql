-- Script 045: Insertar saldo faltante de USD-CP en extracto abierto
-- El valor USD-CP fue agregado a la caja DESPUÉS de abrir el extracto,
-- por lo que no se creó la fila correspondiente en extracto_saldos.
-- Este script la inserta de forma idempotente.
--
-- Extracto: fe5a6beb-b986-42e1-adf7-2cf8f840df3c
-- Valor:    7e91380b-deb4-4a34-a130-d45d741febfe (USD-CP, USDCP, moneda=USD)

INSERT INTO extracto_saldos (
  extracto_id,
  valor_id,
  valor_nombre,
  valor_codigo,
  moneda,
  saldo_apertura,
  saldo_cierre_ingresado
)
SELECT
  'fe5a6beb-b986-42e1-adf7-2cf8f840df3c',
  '7e91380b-deb4-4a34-a130-d45d741febfe',
  'USD - CP',
  'USDCP',
  'USD',
  0,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM extracto_saldos
  WHERE extracto_id = 'fe5a6beb-b986-42e1-adf7-2cf8f840df3c'
    AND valor_id    = '7e91380b-deb4-4a34-a130-d45d741febfe'
);
