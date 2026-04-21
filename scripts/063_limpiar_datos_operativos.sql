-- ============================================================
-- 063 · Limpieza de datos operativos (mantiene maestros)
-- Conserva: clientes, proveedores, productos, cajas/caja_valores,
--            plan de cuentas, diarios, mapeo contable, configuración.
-- Borra:    todo movimiento, comprobante y transacción operativa.
-- CASCADE resuelve todas las FK automáticamente.
-- ============================================================

TRUNCATE TABLE
  -- Contabilidad
  contabilidad_asientos_lineas,
  contabilidad_asientos,
  ajustes_clientes,
  recepciones_toma,
  -- Caja
  movimientos_caja,
  extractos_caja,
  cupones_tarjeta,
  negociaciones_cheques,
  cheques_terceros,
  -- Cuenta corriente
  ventas_cc_movimientos,
  -- Recibos
  recibo_imputaciones,
  recibo_pagos,
  recibos,
  -- Facturas / NV
  facturas_lineas,
  facturas,
  notas_venta_lineas,
  notas_venta,
  ordenes_entrega,
  remitos,
  -- Compras
  compras_facturas_lineas,
  facturas_compra,
  recepciones,
  ordenes_compra,
  ordenes_pago,
  -- Señas de equipo
  senias_equipo,
  -- Stock
  movimientos_stock,
  stock_movimientos,
  stock_cantidades,
  stock_unidades
CASCADE;
