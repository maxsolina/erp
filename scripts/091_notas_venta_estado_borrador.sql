-- ============================================================================
-- Permite el estado 'borrador' en notas_venta
-- ============================================================================
-- Antes: el botón "Guardar Pedido" del form de NV mandaba estado='abierta'
-- al servidor (mismo comportamiento que el monolito), aunque la UI mostraba
-- "Borrador". Era una inconsistencia: la DB no podía distinguir un pedido
-- sin confirmar de una NV con factura abierta asociada.
--
-- Ahora el form manda estado='borrador' real. Para que el insert no falle,
-- ampliamos el CHECK constraint de la columna estado.
--
-- Estados válidos:
--   borrador            — pedido guardado, sin cascada disparada
--   abierta             — NV con factura/remito abierto (intermedio)
--   a_facturar          — esperando facturación
--   verificacion_factura — esperando verificación factura
--   verificacion_oe     — esperando verificación OE
--   facturada           — venta inmediata confirmada con cascada completa
--   finalizada          — entrega completada
--   parcial             — facturada parcialmente
--   cancelada           — cancelada
-- ============================================================================

DO $$
BEGIN
  -- Borrar el constraint si ya existe (idempotente)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notas_venta' AND constraint_name = 'notas_venta_estado_check'
  ) THEN
    ALTER TABLE notas_venta DROP CONSTRAINT notas_venta_estado_check;
  END IF;

  -- Agregar el nuevo CHECK con todos los estados que el ERP usa
  ALTER TABLE notas_venta ADD CONSTRAINT notas_venta_estado_check
    CHECK (estado IN (
      'borrador',
      'abierta',
      'a_facturar',
      'verificacion_factura',
      'verificacion_oe',
      'facturada',
      'finalizada',
      'parcial',
      'cancelada'
    ));
END $$;

-- Verificar
SELECT 'OK - notas_venta_estado_check actualizado' AS resultado;
