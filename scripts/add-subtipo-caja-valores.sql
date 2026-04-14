-- ============================================================================
-- Agregar columna subtipo a caja_valores
-- Módulo: Finanzas → Configuración → Cajas → Valores Permitidos
-- Fecha: 2026-04-12
-- ============================================================================
-- Idempotente: puede ejecutarse múltiples veces sin duplicar.

ALTER TABLE caja_valores
  ADD COLUMN IF NOT EXISTS subtipo TEXT
  CHECK (
    subtipo IS NULL OR subtipo IN (
      'banco',
      'cheque_tercero',
      'tarjeta',
      'rendicion_gastos',
      'fondo_fijo'
    )
  );

COMMENT ON COLUMN caja_valores.subtipo IS
  'Solo aplica cuando tipo = ''banco_cheques''. '
  'Valores posibles: banco | cheque_tercero | tarjeta | rendicion_gastos | fondo_fijo. '
  'Null cuando tipo = ''efectivo''.';

-- Actualizar valores existentes de tipo banco_cheques que tengan "Cheque" en el nombre
UPDATE caja_valores
SET subtipo = 'cheque_tercero'
WHERE tipo = 'banco_cheques'
  AND subtipo IS NULL
  AND (LOWER(nombre) LIKE '%cheque%');
