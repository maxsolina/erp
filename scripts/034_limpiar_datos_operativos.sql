-- ============================================================
-- Script: 034_limpiar_datos_operativos.sql
-- Propósito: Eliminar TODOS los datos operativos/transaccionales
--            para empezar desde cero con datos limpios.
-- Mantiene intactos: clientes, proveedores, productos,
--   tablas de configuración y plan contable.
-- IMPORTANTE: Ejecutar solo en entorno de desarrollo/prueba.
-- ============================================================

BEGIN;

-- ─── 1. Nullear FKs circulares hacia contabilidad_asientos ──────────────────
-- (para poder eliminar asientos sin violar restricciones)

UPDATE recepciones_toma   SET asiento_id = NULL WHERE asiento_id IS NOT NULL;
UPDATE ajustes_clientes   SET asiento_id = NULL WHERE asiento_id IS NOT NULL;

-- Recepciones de compra (010_alter_recepciones.sql agrega asiento_circuito_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recepciones' AND column_name = 'asiento_circuito_id'
  ) THEN
    UPDATE recepciones SET asiento_circuito_id = NULL WHERE asiento_circuito_id IS NOT NULL;
  END IF;
END $$;

-- Facturas de compra (025_alter agrega asiento_id)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'facturas_compra' AND column_name = 'asiento_id'
  ) THEN
    UPDATE facturas_compra SET asiento_id = NULL WHERE asiento_id IS NOT NULL;
  END IF;
END $$;

-- Recibos
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recibos' AND column_name = 'asiento_id'
  ) THEN
    UPDATE recibos SET asiento_id = NULL WHERE asiento_id IS NOT NULL;
  END IF;
END $$;

-- Compras ordenes pago
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compras_ordenes_pago' AND column_name = 'asiento_id'
  ) THEN
    UPDATE compras_ordenes_pago SET asiento_id = NULL WHERE asiento_id IS NOT NULL;
  END IF;
END $$;

-- ─── 2. Contabilidad: lineas y extractos (hijos primero) ────────────────────

DELETE FROM contabilidad_asientos_lineas;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contabilidad_extracto_lineas') THEN
    DELETE FROM contabilidad_extracto_lineas;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contabilidad_extractos_banco') THEN
    DELETE FROM contabilidad_extractos_banco;
  END IF;
END $$;

DELETE FROM contabilidad_asientos;

-- Resetear secuencias de numeración de diarios
UPDATE contabilidad_diarios_secuencias SET ultimo_numero = 0 WHERE ultimo_numero > 0;

-- ─── 3. Toma de equipo y ajustes ────────────────────────────────────────────

DELETE FROM recepciones_toma;
DELETE FROM ajustes_clientes;
DELETE FROM tomas_equipo;
DELETE FROM senias_equipo;

-- ─── 4. Compras ─────────────────────────────────────────────────────────────

-- Medios de pago y comprobantes de OP (hijos)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'compras_op_medios_pago') THEN
    DELETE FROM compras_op_medios_pago;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'compras_op_comprobantes') THEN
    DELETE FROM compras_op_comprobantes;
  END IF;
END $$;

-- Líneas de facturas compra
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'compras_facturas_lineas') THEN
    DELETE FROM compras_facturas_lineas;
  END IF;
END $$;

-- Pagos de facturas compra
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'compras_facturas_pagos') THEN
    DELETE FROM compras_facturas_pagos;
  END IF;
END $$;

-- Ordenes de pago (nuevo)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'compras_ordenes_pago') THEN
    DELETE FROM compras_ordenes_pago;
  END IF;
END $$;

-- Recepciones de compra (referencia facturas_compra.id via factura_id FK)
DELETE FROM recepciones;

-- Notas de crédito y débito compra
DELETE FROM notas_credito_compra;
DELETE FROM notas_debito_compra;

-- Facturas de compra
DELETE FROM facturas_compra;

-- Ordenes de compra
DELETE FROM ordenes_compra;

-- Ordenes de pago (tabla original del 004)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ordenes_pago') THEN
    DELETE FROM ordenes_pago;
  END IF;
END $$;

-- ─── 5. Ventas ───────────────────────────────────────────────────────────────

-- Líneas y facturas de venta
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'facturas_lineas') THEN
    DELETE FROM facturas_lineas;
  END IF;
END $$;

DELETE FROM facturas;

-- Notas de venta
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notas_venta_lineas') THEN
    DELETE FROM notas_venta_lineas;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notas_venta') THEN
    DELETE FROM notas_venta;
  END IF;
END $$;

-- Ordenes de entrega
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ordenes_entrega_lineas') THEN
    DELETE FROM ordenes_entrega_lineas;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ordenes_entrega') THEN
    DELETE FROM ordenes_entrega;
  END IF;
END $$;

-- Remitos
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'remitos') THEN
    DELETE FROM remitos;
  END IF;
END $$;

-- ─── 6. Recibos de cobro ─────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recibo_pagos') THEN
    DELETE FROM recibo_pagos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recibos') THEN
    DELETE FROM recibos;
  END IF;
END $$;

-- ─── 7. Stock ────────────────────────────────────────────────────────────────

DELETE FROM movimientos_stock;
DELETE FROM stock_unidades;
DELETE FROM stock_cantidades;

-- ─── 8. Taller: órdenes de trabajo y turnos ─────────────────────────────────
-- (Se mantiene config: tecnicos, categorias, tipos_ot, controles, fallas_por_equipo)

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'taller_ot_control_items') THEN
    DELETE FROM taller_ot_control_items;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'taller_ot_controles') THEN
    DELETE FROM taller_ot_controles;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'taller_ot_repuestos') THEN
    DELETE FROM taller_ot_repuestos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'taller_ot_fallas_secundarias') THEN
    DELETE FROM taller_ot_fallas_secundarias;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'taller_ot_historial') THEN
    DELETE FROM taller_ot_historial;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'taller_ordenes_trabajo') THEN
    DELETE FROM taller_ordenes_trabajo;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'taller_turnos') THEN
    DELETE FROM taller_turnos;
  END IF;
END $$;

-- ─── 9. Finanzas: cajas ──────────────────────────────────────────────────────

-- Transferencias caja (hijos primero)
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transferencia_caja_valores') THEN
    DELETE FROM transferencia_caja_valores;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transferencias_caja') THEN
    DELETE FROM transferencias_caja;
  END IF;
END $$;

-- Ajustes de caja
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ajuste_caja_valores') THEN
    DELETE FROM ajuste_caja_valores;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ajustes_caja') THEN
    DELETE FROM ajustes_caja;
  END IF;
END $$;

-- Registros de caja
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'registro_caja_valores') THEN
    DELETE FROM registro_caja_valores;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'registro_caja_comprobantes') THEN
    DELETE FROM registro_caja_comprobantes;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'registros_caja') THEN
    DELETE FROM registros_caja;
  END IF;
END $$;

-- Movimientos y extracto de caja
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'movimientos_caja') THEN
    DELETE FROM movimientos_caja;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extracto_saldos') THEN
    DELETE FROM extracto_saldos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extractos_caja') THEN
    DELETE FROM extractos_caja;
  END IF;
END $$;

-- ─── 10. Finanzas: bancos ────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ajustes_banco') THEN
    DELETE FROM ajustes_banco;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'registro_banco_valores') THEN
    DELETE FROM registro_banco_valores;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'registro_banco_comprobantes') THEN
    DELETE FROM registro_banco_comprobantes;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'registros_banco') THEN
    DELETE FROM registros_banco;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'deposito_bancario_valores') THEN
    DELETE FROM deposito_bancario_valores;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'depositos_bancarios') THEN
    DELETE FROM depositos_bancarios;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extraccion_valores') THEN
    DELETE FROM extraccion_valores;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'extracciones') THEN
    DELETE FROM extracciones;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transferencias_bancarias') THEN
    DELETE FROM transferencias_bancarias;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversiones_moneda') THEN
    DELETE FROM conversiones_moneda;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'movimientos_banco') THEN
    DELETE FROM movimientos_banco;
  END IF;
END $$;

-- ─── 11. Cheques y préstamos ─────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'negociacion_valores') THEN
    DELETE FROM negociacion_valores;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'negociacion_gastos') THEN
    DELETE FROM negociacion_gastos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'negociacion_cheques_devueltos') THEN
    DELETE FROM negociacion_cheques_devueltos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'negociacion_cheques_items') THEN
    DELETE FROM negociacion_cheques_items;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'negociaciones_cheques') THEN
    DELETE FROM negociaciones_cheques;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notas_debito_cheque_rechazado') THEN
    DELETE FROM notas_debito_cheque_rechazado;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cheques_terceros') THEN
    DELETE FROM cheques_terceros;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prestamo_gastos') THEN
    DELETE FROM prestamo_gastos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prestamo_pagos') THEN
    DELETE FROM prestamo_pagos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prestamo_cuotas') THEN
    DELETE FROM prestamo_cuotas;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prestamos') THEN
    DELETE FROM prestamos;
  END IF;
END $$;

-- ─── 12. Conciliaciones ──────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conciliacion_tarjeta_cargos') THEN
    DELETE FROM conciliacion_tarjeta_cargos;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conciliacion_tarjeta_cupones') THEN
    DELETE FROM conciliacion_tarjeta_cupones;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conciliaciones_tarjetas') THEN
    DELETE FROM conciliaciones_tarjetas;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cupones_tarjeta') THEN
    DELETE FROM cupones_tarjeta;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conciliaciones_bancarias') THEN
    DELETE FROM conciliaciones_bancarias;
  END IF;
END $$;

COMMIT;

-- ─── Resumen de lo que se conserva ───────────────────────────────────────────
-- ✅ clientes, proveedores, productos
-- ✅ categorias_cliente, categorias_proveedor
-- ✅ sucursales, depositos, ubicaciones
-- ✅ contabilidad_plan_cuentas, contabilidad_diarios, contabilidad_mapeo_cuentas
-- ✅ contabilidad_tipos_cuenta, contabilidad_anos_fiscales, contabilidad_periodos
-- ✅ nc_categorias, bancos, cajas, caja_valores, caja_bancos_permitidos
-- ✅ cuentas_bancarias, chequeras, tipos_movimiento_bancario
-- ✅ taller_tecnicos, taller_categorias_reparacion, taller_tipos_ot
-- ✅ taller_controles, taller_fallas_por_equipo, tipos_prestamo
-- ✅ versiones_lista_precios, conceptos_registro_caja
-- ⚠️  contabilidad_diarios_secuencias: ultimo_numero reseteado a 0
