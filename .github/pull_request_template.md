## Resumen
- Objetivo del cambio:
- Módulos impactados:
- Riesgos conocidos:

## Tipo de Cambio
- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Migración SQL
- [ ] Cambio de permisos/roles
- [ ] Cambio contable

## Checklist General (bloqueante)
- [ ] Revisé si existía lógica/tabla/endpoint reutilizable antes de crear nuevo.
- [ ] Repliqué patrón existente del módulo cuando aplicaba.
- [ ] No dejé mocks en flujo productivo.
- [ ] No introduje errores nuevos de compilación en archivos tocados.

## Checklist UI Listas (si aplica)
- [ ] Título usa estilo estándar (`text-2xl font-bold text-amber-900`).
- [ ] Botón principal usa estilo estándar (`bg-indigo-900 hover:bg-indigo-800 text-white`).
- [ ] Tabla usa encabezado/filas estándar.
- [ ] Se usa `OdooFilterBar` (búsqueda, filtros, agrupar, favoritos, contador).
- [ ] Se reutiliza wrapper del módulo (`StockListSection`, `FinanzasListSection`, `VentasListSection`, `ComprasListSection`) o equivalente.

## Checklist Contable (si aplica)
- [ ] Todo comprobante afectado genera asiento automático.
- [ ] Confirmación/publicación bloquea si falla asiento.
- [ ] Comprobante + asiento se ejecutan en la misma transacción.
- [ ] Se validó partida doble (debe = haber).
- [ ] No hay cuentas contables hardcodeadas.
- [ ] Se respeta idempotencia por origen (`tipo_origen` + `id_origen`).
- [ ] No se modifica/elimina asiento publicado; se corrige con reversa/ajuste.
- [ ] Se validó que el período contable esté abierto para contabilizar.

## Checklist Valorización de Stock (si aplica)
- [ ] La valorización automática genera asiento contable.
- [ ] El asiento referencia explícitamente el movimiento de stock (`stock_movimiento_id` o equivalente).

## Checklist Procesos Masivos / Backfill (si aplica)
- [ ] Script/proceso es idempotente y re-ejecutable sin duplicar asientos.
- [ ] Se registra `run_id`, usuario, fecha/hora y cantidad afectada.
- [ ] Se probó en entorno de prueba antes de producción.
- [ ] Existe estrategia documentada de rollback/reversa.
- [ ] Se dejó mecanismo de conciliación posterior automática.

## Checklist Permisos / Configuración del Sistema (si aplica)
- [ ] Permisos validados en backend (no solo frontend).
- [ ] Se respeta RBAC centralizado y política deny-by-default.
- [ ] Se respeta alcance por sucursal y ámbito de usuario.
- [ ] Se registró auditoría de cambios de roles/permisos (antes/después).
- [ ] Roles/permisos base quedaron en seed/migración versionada.

## Migraciones SQL (si aplica)
- [ ] El cambio de esquema está en `scripts/` con nombre claro.
- [ ] La migración es segura para re-ejecución (o está documentado su uso único).
- [ ] Se documentó impacto y orden de ejecución.

## Evidencia de Pruebas
- [ ] Caso feliz validado.
- [ ] Caso de error validado.
- [ ] Caso de permisos validado.
- [ ] Caso de idempotencia validado (si aplica).
- [ ] Adjunté evidencia mínima (capturas/logs/queries).

## Impacto en Datos
- Tablas afectadas:
- Endpoints afectados:
- Scripts ejecutados:
- Plan de reversa:

## Notas para Deploy
- Orden sugerido de despliegue:
- Flags/configuración requerida:
- Tareas post-deploy:
