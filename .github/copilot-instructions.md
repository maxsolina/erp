# Instrucciones de Desarrollo - ERP

## Regla obligatoria para nuevas pantallas de lista

Toda nueva pantalla/listado/item de tipo tabla (ABM, listado operativo o configuración) DEBE crearse con el estilo estándar definido por la referencia "IMEI en Stock".

### Estilo obligatorio
- Título: `text-2xl font-bold text-amber-900`
- Botón de acción principal: `bg-indigo-900 hover:bg-indigo-800 text-white`
- Tabla:
  - encabezado: `border-b bg-gray-50`
  - celdas de encabezado: `text-xs font-semibold text-gray-600 uppercase`
  - filas: `border-b border-gray-100 hover:bg-gray-50`
- Debe incluir siempre `OdooFilterBar` con:
  - búsqueda
  - filtros
  - agrupar
  - favoritos
  - contador `filteredCount / totalCount`

### Implementación obligatoria
- Priorizar wrappers reutilizables por módulo (`StockListSection`, `FinanzasListSection`, `VentasListSection`, `ComprasListSection`) o crear uno equivalente si el módulo no lo tiene.
- Evitar construir filtros inline con `<input>` o `<select>` sueltos cuando la vista sea una lista estándar.
- Mantener lógica de filtros y búsqueda dentro del wrapper + `OdooFilterBar`.
- En wrappers genéricos TypeScript, usar `T extends object`.

### Excepciones
- Vistas especiales de conciliación o matching de doble panel pueden mantener UI específica, pero deben conservar el mismo lenguaje visual (tipografía, colores, tablas y botones).

## Regla obligatoria: posición de botones en formularios

Todo formulario de creación o edición (pantalla completa, panel o drawer) DEBE ubicar los botones de acción **en el encabezado, arriba a la derecha**, junto al título del formulario. Está prohibido colocar botones Guardar/Cancelar al pie o al final del contenido.

### Patrón obligatorio de header con acciones

```tsx
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-4">
    <BotonVolver onClick={onCancelar} variant="minimal" texto="" />
    <h1 className="text-2xl font-bold text-amber-900">Título del formulario</h1>
  </div>
  <div className="flex items-center gap-3">
    <button
      onClick={onCancelar}
      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
    >
      Cancelar
    </button>
    <button
      onClick={onGuardar}
      disabled={guardando || !condicionHabilitado}
      className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors"
    >
      {guardando ? "Guardando..." : "Guardar"}
    </button>
  </div>
</div>
```

### Reglas derivadas
- El `BotonVolver`/botón de retorno va siempre a la izquierda del título.
- Los botones de acción van siempre a la derecha del header (nunca al pie del formulario).
- El botón primario usa `bg-indigo-900 hover:bg-indigo-800 text-white`.
- El botón secundario (Cancelar) usa `border border-gray-300 text-gray-700 hover:bg-gray-50`.
- Gap entre botones: `gap-3`.
- **Excepciones**: modales emergentes pequeños (confirmaciones de eliminación, etc.) pueden tener botones en el footer del modal.


- Antes de crear nueva lógica, reutilizar funciones/componentes existentes del módulo.
- Si existe patrón ya implementado en otro módulo, replicar ese patrón en lugar de crear uno nuevo.

## Reglas transversales para Contabilidad

### Asientos automáticos obligatorios
- Todo comprobante que impacte negocio debe generar asiento automático.
- Está prohibido confirmar/publicar un comprobante si falla la generación del asiento.
- La creación del comprobante y del asiento debe ser atómica en una sola transacción.
- Los asientos deben ser idempotentes por origen (`tipo_origen` + `id_origen`), sin duplicación.
- Cada asiento debe guardar trazabilidad: origen, tipo de comprobante, `id_origen`, usuario, sucursal y fecha contable.

### Integridad contable
- No se permiten cuentas contables hardcodeadas en código; deben salir de configuración.
- Antes de publicar, validar partida doble: total debe = total haber.
- Si el período contable está cerrado, no se puede contabilizar, recontabilizar ni modificar.
- Los asientos contabilizados son inmutables; se corrigen solo con reversa/contrapartida.

### Valorización automática de mercadería
- Todo proceso de valorización automática debe registrar asiento contable con referencia al movimiento de stock.
- Cada asiento de valorización debe vincular explícitamente el `stock_movimiento_id` o referencia equivalente.

## Reglas para procesos masivos y migraciones contables

### Idempotencia y trazabilidad de ejecución
- Toda query masiva contable debe ser idempotente y re-ejecutable sin duplicar asientos.
- Toda ejecución masiva debe registrar `run_id`, fecha/hora, usuario, criterios y cantidad de registros afectados.

### Seguridad operativa
- Antes de ejecutar en producción, correr simulación en entorno de prueba y validar balance final.
- Toda migración o backfill contable debe tener estrategia de reversa/rollback documentada.
- Está prohibido ejecutar scripts contables masivos sin conciliación posterior automática.

## Reglas para Configuración del Sistema

### Permisos y acceso
- Modelo de permisos único y centralizado (RBAC), sin lógica de permisos dispersa por módulo.
- Política `deny-by-default`: si un permiso no está explícitamente habilitado, se deniega.
- Todo endpoint sensible debe validar permisos en backend, no solo en frontend.
- Toda operación debe respetar alcance por sucursal y ámbito del usuario.

### Segregación y auditoría
- Debe existir segregación de funciones para acciones críticas (ej: crear usuarios, asignar roles, cerrar períodos, recontabilizar).
- Todo cambio de permisos/roles debe dejar auditoría completa (quién, cuándo, antes, después).
- Roles y permisos base deben existir por seed/migración versionada, no por carga manual ad-hoc.

## Reglas de ingeniería y calidad obligatorias

### Diseño previo a crear entidades
- Antes de crear nueva tabla/endpoint/flujo, revisar si existe lógica o tabla reutilizable.
- Si existe un patrón equivalente en otro módulo, replicarlo antes de inventar uno nuevo.
- Toda alteración de esquema debe ir en script SQL versionado en `scripts/` con nombre claro y propósito explícito.

### Transaccionalidad e idempotencia
- Operaciones críticas multi-módulo (ventas, stock, finanzas, contabilidad) deben ejecutarse de forma transaccional.
- Todo proceso automático o integración debe implementar clave de idempotencia.

### Inmutabilidad y reversión
- Documentos/asientos publicados no se eliminan ni editan directamente; se corrigen con reversa o ajuste.

### Definition of Done (DoD)
- No se considera terminado un cambio si:
  - genera errores nuevos de compilación en archivos tocados,
  - rompe trazabilidad de auditoría,
  - omite validación de permisos en backend,
  - introduce mocks donde se requieren datos reales,
  - o no garantiza idempotencia en procesos automáticos/masivos.

## Regla de checklist por Pull Request (obligatoria)
- Todo PR debe completar la plantilla `/.github/pull_request_template.md`.
- Si una sección "si aplica" no corresponde, se debe marcar explícitamente como "No aplica" en la descripción del PR.
- No se debe aprobar ni fusionar un PR con checks críticos incompletos en contabilidad, permisos, migraciones o transaccionalidad.
