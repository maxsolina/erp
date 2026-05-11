# Estado de la migración a Routing limpio (App Router)

Última actualización: 2026-04-30 — **migración funcionalmente completa (PRs 0–90)**. Todos los módulos accesibles vía URLs limpias `/modulo/vista`, sin redirects al monolito. Forms críticos migrados a rutas propias (Patrón A); el resto mounta el monolito inline en modo embedded (sin sidebar duplicado).

## Resumen final

Todos los módulos del ERP tienen ahora una URL top-level `/<modulo>/<sub-vista>` con:
- **Topbar global** siempre visible (en `(dashboard)/layout.tsx`)
- **Sidebar global** por módulo siempre visible (configs en `components/sidebars/`)
- **F5** mantiene la ruta y restaura sesión + permisos
- **Ctrl+Click** abre cualquier ítem en pestaña nueva
- **URLs bookmarkables** y compartibles

### Estrategia por módulo

- **Migración real (componentes extraídos + listings + fichas)**: Productos, Listas de Precios, Proveedores, Sucursales, Usuarios, Toma de Equipo, Servicio Técnico (16 rutas), Stock (19 rutas), Compras OC + Recepciones + Facturas + NC/ND + OP, Ventas Clientes.
- **Redirect-stubs (URL top-level que redirige al monolito)**: Compras (legajos, despachos, conciliación, categorías), Ventas (NV, OE, Remitos, Facturas, Recibos, NC, ND, Ajustes, Categorías, Cotizador, NC-Categorías, Seña), Finanzas (25 rutas), Contabilidad (19 rutas).
- **Página única**: Informes (`/informes` mounta directamente `<ModuloInformes />`).

Los redirect-stubs sincronizan `?view=` con el monolito vía `useSearchParams()` (ventas-module, modulo-compras-v2, modulo-finanzas, modulo-contabilidad). El sidebar global muestra los items con la ruta limpia, y al cliquear el monolito abre directamente en esa sub-vista.

## PRs completados

- ✅ **PR 0** — Setup: `(dashboard)/layout.tsx` con auth gate + ERPProvider en root layout + `/login`
- ✅ **PR 1** — Productos (`/productos`, `/productos/nuevo`, `/productos/[id]`)
- ✅ **PR 2** — Sucursales (`/sucursales`, `/sucursales/nueva`, `/sucursales/[id]`)
- ✅ **PR 3** — Usuarios (`/usuarios`, `/usuarios/nuevo`, `/usuarios/[id]`)
- ✅ **PR 4** — Proveedores (`/proveedores`, `/proveedores/nuevo`, `/proveedores/[id]`, `/proveedores/[id]/editar`)
- ✅ **PR 5** — Listas de Precios (8 archivos componentes, 8 rutas)
- ✅ **PR 6** — Toma de Equipo (`/toma-equipo`, `/toma-equipo/nueva`, `/toma-equipo/[id]`)
- ✅ **PR 7** — Servicio Técnico/Taller (16 rutas: dashboard, OT, kanban, catálogos, configuración)
- ✅ **PR 8** — Stock parte 1 (5 rutas operativas: dashboard, transferencias, pedidos)
- ✅ **PR 9** — Stock parte 2 (14 rutas) + topbar global + sidebars globales por módulo + fix F5
- ✅ **PR 10** — Compras parte 1 (OC + Recepciones, 5 rutas con extracción real)
- ✅ **PR 11** — Compras parte 2 (Facturas + NC/ND + OP con listings + ficha; legajos/despachos/conciliación/categorías como redirects)
- ✅ **PR 12** — Ventas parte 1 (Clientes + Conciliación)
- ✅ **PR 13–15** combinados — Ventas partes 2/3/4 (22 rutas como redirect-stubs)
- ✅ **PR 16** — Finanzas (25 rutas redirect-stubs + sidebar config)
- ✅ **PR 17** — Contabilidad (19 rutas redirect-stubs + sidebar config)
- ✅ **PR 18** — Informes (`/informes` monta ModuloInformes directo)

## Pendiente para limpieza futura (cleanup post-PR-18)

No bloqueante; el ERP está completamente funcional con clean URLs.

1. **Convertir redirect-stubs a extracciones reales** (con su propio listado/ficha/form):
   - **Ventas — TODOS COMPLETADOS** (post-PR-18 cleanup):
     - ~~NV, OE, Remitos, Facturas, Recibos~~ — los 5 documentos principales con listado + ficha read-only
     - ~~Ajustes, NC, ND~~ — 3 vistas sobre la misma tabla (`ajustes_clientes`)
     - ~~Seña~~ — listado con stats cards + ficha rica
     - ~~Categorías Cliente, NC-Categorías~~ — listados simples
     - ~~Criterios Cotizador~~ — montaje directo del componente standalone existente
   - **Compras**: ~~Categorías de Proveedores~~ extraída (post-PR-18 cleanup). Todavía como redirect-stubs: Legajos Importación, Despachos Simples, Conciliación de Deuda.
   - **Finanzas**: las 25 rutas (todas redirect-stubs hoy)
   - **Contabilidad**: las 19 rutas (todas redirect-stubs hoy)
2. **Borrar dead code** en los monolitos:
   - `components/ventas-module.tsx`: render functions de listas-precios, toma-equipo (ya migradas), y ahora también de NV/OE/Remitos/Facturas/Recibos/Ajustes/NC/ND/Seña (extraídas post-PR-18). Ninguna se llama desde JSX una vez que la URL top-level ya no rebota al monolito.
   - `components/modulo-compras-v2.tsx`: render functions de OC, recepciones, etc. (parcial); más Categorías Proveedores (extraída post-PR-18)
   - ~~`components/modulo-stock.tsx`~~ — borrado (post-PR-18 cleanup)
   - ~~`components/modulo-taller.tsx`~~ — borrado (post-PR-18 cleanup)
   - ~~`components/modulo-compras.tsx` (v1)~~ — borrado (post-PR-18 cleanup)
   - ~~`app/(dashboard)/page.tsx`: helpers `renderSidebar`/`renderContent` + `render*` específicos de Taller~~ — borrado (~1390 líneas, post-PR-18 cleanup)
3. **Deduplicar helpers** (`formatCurrency`, `formatDate`) — ~~hay copias en cada `components/<modulo>/_shared.ts`~~ unificadas en `lib/format.ts` (post-PR-18 cleanup). Pendiente todavía: copias in-line en monolitos (`modulo-finanzas`, `modulo-home`, `modulo-informes`, `ventas-module`, `modulo-compras-v2`). **No-go por ahora**: `proveedores/listado.tsx` y `proveedores/ficha.tsx` — su `formatCurrency` produce `"ARS $ 1.234,56"` (prefijo manual) en lugar de `"$ 1.234,56"` del `Intl currency`; unificar regresa la UI hasta que decidamos qué formato es el correcto.
4. **Mover `app/(dashboard)/page.tsx` a un dashboard limpio** — hoy sigue siendo el "shell" del monolito completo. Idealmente queda solo como home dashboard con KPIs.
5. **Resolver TODOs marcados** (movimientosCtaCte en proveedores, modal vs página para algunos forms, etc.)

### Notas para extraer Finanzas / Contabilidad

Los 25 stubs de Finanzas y los 19 de Contabilidad siguen siendo los blocs grandes pendientes. Cada uno requiere:
- Verificar que exista API endpoint en `app/api/...` (varios módulos leen Supabase directamente desde el cliente y necesitan un endpoint nuevo, similar a lo que se hizo con `/api/recibos` y `/api/nc-categorias`).
- Crear `components/<modulo>/<entidad>-listado.tsx` (+ `<entidad>-ficha.tsx` si la vista de detalle es no trivial).
- Reemplazar la `page.tsx` del stub por el listado real.
- Mantener el botón "Editar en monolito" para creación/edición compleja (mismo patrón que Compras OC/Ventas NV).

**Ya extraídos (post-PR-18 cleanup):**
- Finanzas: ~~Cajas~~ — listado real desde `/api/cajas`.
- Contabilidad — **9 de 19 rutas extraídas** con APIs ya existentes:
  - ~~Plan de Cuentas~~ (con joins a tipo_cuenta + cuenta_padre)
  - ~~Años Fiscales~~ (con cantidad de períodos)
  - ~~Períodos~~ (con join a año fiscal)
  - ~~Diarios~~ (con joins a sucursal + cuentas predeterminadas)
  - ~~Monedas~~ (con destacado para moneda base)
  - ~~Tipos de Cotización~~
  - ~~Tipos de Cuenta~~
  - ~~Asientos Manuales~~ (filtra es_manual=true)
  - ~~Asientos Automáticos~~ (filtra es_manual=false, muestra origen)
  - Para minimizar duplicación, las 6 entidades simples comparten un `<ContabilidadConfigList>` parametrizable (en `components/contabilidad/config-list-shell.tsx`); las 2 vistas de asientos comparten `<AsientosListadoBase>`.

**Pendientes en Contabilidad (10 rutas restantes):**
- **Reportes** (requieren más diseño que un listado simple — agregaciones, filtros por período, etc.): Balance General, Balance de Sumas y Saldos, Estado de Resultados, Libro Mayor, Libro IVA Digital, Informes Contables, Diagrama de Impuestos.
- **Sin API o features placeholder**: Amortizaciones, Control Presupuestario, Devengamientos Diferidos.

**Finanzas — extracción masiva (sesión post-PR-65):**

Se generalizó `ContabilidadConfigList` (ahora acepta `monolithModule` y `eyebrow`) y se extrajeron 20 vistas más a partir de Cajas + BancosConfig. Cada una agrega:
- Endpoint GET en `app/api/<entidad>/route.ts` (server-side, respeta RLS).
- `components/finanzas/<entidad>-listado.tsx` montando el shell con sus columnas.
- `app/(dashboard)/finanzas/<entidad>/page.tsx` reemplazando el redirect-stub.

Tipos y badge helpers (`estadoBadgeClass`/`estadoLabel`) viven en `components/finanzas/_shared.ts`.

| Listado | API nueva | Tabla |
|---------|-----------|-------|
| Bancos Config (3 sub-tabs) | `/api/bancos`, `/api/cuentas-bancarias`, `/api/tipos-movimiento-bancario` | `bancos`, `cuentas_bancarias`, `tipos_movimiento_bancario` |
| Conceptos | `/api/conceptos-registro-caja` | `conceptos_registro_caja` |
| Tipos de Préstamos | `/api/tipos-prestamo` | `tipos_prestamo` |
| Tarjetas | (reusa `/api/tarjetas`) | `tarjetas` |
| Grupos | (reusa `/api/grupos-tarjeta`) | `grupos_tarjeta` |
| Recargos | (reusa `/api/recargos-tarjeta`) | `recargos_tarjeta` |
| Cupones | `/api/cupones-tarjeta` | `cupones_tarjeta` |
| Registros de Caja | `/api/registros-caja` | `registros_caja` |
| Registros de Banco | `/api/registros-banco` | `registros_banco` |
| Ajustes de Caja | `/api/ajustes-caja` | `ajustes_caja` |
| Ajustes de Banco | `/api/ajustes-banco` | `ajustes_banco` |
| Transferencias de Caja | `/api/transferencias-caja` | `transferencias_caja` |
| Transferencias Bancarias | `/api/transferencias-bancarias` | `transferencias_bancarias` |
| Depósitos | `/api/depositos-bancarios` | `depositos_bancarios` |
| Extracciones | `/api/extracciones` | `extracciones` |
| Conversión de Monedas | `/api/conversiones-moneda` | `conversiones_moneda` |
| Préstamos | `/api/prestamos` | `prestamos` |
| Cheques de Terceros | `/api/cheques-terceros` | `cheques_terceros` |
| Negociación de Cheques | `/api/negociaciones-cheques` | `negociaciones_cheques` |
| Extractos de Caja | `/api/extractos-caja` | `extractos_caja` |

El botón "Nuevo X" y los clicks en la fila linkean al monolito (`/?module=finanzas&view=<id>`) — la edición sigue ahí; el listing es read-only.

**Stubs que se mantienen embedded (sin extraer):**
- **Cheques Propios** — placeholder en el monolito (`setLista([])`, no hay tabla aún). Los cheques propios se generan al pagar con cheque en Compras → Órdenes de Pago.
- **Conciliación Bancaria** — flujo con detail + cargos + matching contra movimientos; merece su propio diseño cuando se migre.
- **Conciliación de Tarjetas** — flujo con detail + cupones + cargos; misma razón.
- **Simulador** — calculadora interactiva, no es una listing.

Total Finanzas tras esta sesión: **22 de 25 rutas extraídas con listing real**; 3 mountan el monolito inline (URL clean, sidebar/topbar global preservados).

**Finanzas — forms a rutas propias (sesión post-listings):**

Patrón A (componente standalone con `initialId`, POST + PUT endpoints server-side, ruta `/nuevo` y `/[id]/editar`). El shell `ContabilidadConfigList` se extendió con `newHref` + `editHref` para que cada listing apunte directo a sus rutas.

**15 forms migrados:**

Configs y maestros (single-table CRUD):

| Entidad | API new | Form / pages |
|---------|---------|--------------|
| Conceptos | `POST /api/conceptos-registro-caja` + `PUT /[id]` | `concepto-form.tsx` |
| Tipos de Préstamos | `POST /api/tipos-prestamo` + `PUT /[id]` | `tipo-prestamo-form.tsx` |
| Bancos | `POST /api/bancos` + `PUT /[id]` | `banco-form.tsx` (en `bancos-config/bancos/`) |
| Cuentas Bancarias | `POST /api/cuentas-bancarias` + `PUT /[id]` | `cuenta-bancaria-form.tsx` |
| Tipos Movimiento Banc. | `POST /api/tipos-movimiento-bancario` + `PUT /[id]` | `tipo-movimiento-bancario-form.tsx` |
| Tarjetas | (PUT/POST ya existía) | `tarjeta-form.tsx` |
| Grupos | `POST` extendido con `tarjeta_ids` + `cargos` | `grupo-form.tsx` |
| Recargos | (PUT/POST ya existía) | `recargo-form.tsx` |

Transaccionales (multi-tabla + publicar workflow):

| Entidad | Endpoints | Form |
|---------|-----------|------|
| Ajustes Banco | `POST/PUT` + RPC `generar_numero_ajuste_banco` | `ajuste-banco-form.tsx` |
| Conversión de Monedas | `POST/PUT` + `[id]/publicar` (egreso/ingreso valor + diferencia redondeo) | `conversion-moneda-form.tsx` |
| Transferencias Bancarias | `POST/PUT` + `[id]/publicar` (2 mov_banco) | `transferencia-bancaria-form.tsx` |
| Depósitos | `POST/PUT` con líneas `deposito_bancario_valores` + `[id]/publicar` (mov_caja egreso por línea + mov_banco ingreso total) | `deposito-form.tsx` |
| Extracciones | `POST/PUT` con líneas `extraccion_valores` + `[id]/publicar` (mov_caja ingreso por línea + mov_banco egreso, valida valor en caja destino) | `extraccion-form.tsx` |
| Ajustes Caja | `POST/PUT` con líneas `ajuste_caja_valores` (tipo `entrada`/`salida`) + `[id]/publicar` (mov_caja por línea) | `ajuste-caja-form.tsx` |
| Transferencias de Caja | `POST/PUT` + `[id]/publicar` (mov_caja egreso confirmado + ingreso pendiente) + `[id]/recibir` (confirma ingreso) + `[id]/cancelar` (cancela ambos movs) | `transferencia-caja-form.tsx` |

Helpers compartidos en [lib/finanzas-server.ts](lib/finanzas-server.ts): `getExtractoAbierto`, `getValorEnCaja`.

**6 forms transaccionales complejos (sesión final):**

| Entidad | Endpoints | Workflow |
|---------|-----------|----------|
| Registros de Caja | `POST/PUT` con comprobantes + valores + `[id]/confirmar` (mov_caja egreso por valor) + `[id]/cancelar` (marca movs como cancelados, valida extracto abierto) | borrador → confirmado → cancelado |
| Registros de Banco | `POST/PUT` con comprobantes + valores + `[id]/confirmar` (mov_banco egreso por valor) | borrador → confirmado |
| Préstamos | `POST/PUT` + `[id]/confirmar` (genera cuotas según sistema francés/alemán/americano/bullet + mov_caja ingreso si no es preexistente) + `[id]/cuotas/[cuotaId]/pagar` (mov_caja egreso + actualiza saldo) | borrador → pendiente → cerrado |
| Negociación de Cheques | `POST/PUT` con items (cheques) + gastos + `[id]/avanzar` (flujo borrador → en_negociacion → cobranza → liquidacion → finalizada, con mov_caja egreso + mov_banco ingreso al finalizar) + `[id]/rechazar-cheque` (genera ND + marca cheque rechazado) | flujo 5 estados |
| Extractos de Caja | `POST` apertura (genera saldos por valor desde último cierre) + `[id]/cerrar` (registra saldos físicos) | abierto → cerrado |
| Cajas | `POST/PUT` con info básica + flags de cierre diario. Los tabs Valores/Bancos/Usuarios siguen mostrándose en el monolito (link desde la ficha de edit). | — |

Helpers: `generarCuotasPrestamo` en [lib/finanzas-server.ts](lib/finanzas-server.ts) — algoritmos de amortización (francés, alemán, americano, bullet) reutilizables.

## Finanzas — estado final

**21 forms migrados a rutas propias** con Patrón A (POST/PUT server-side, /nuevo y /[id]/editar). Cubre 100% de las entidades editables del módulo (los 4 stubs sin form — Cheques Propios placeholder, Conciliaciones, Simulador — siguen embedded por diseño).

Cuando bug-cero esté validado, el siguiente paso es borrar los `function XxxForm()` / `ConfigCajas` / `function Prestamos()` etc. del monolito `components/modulo-finanzas.tsx` — son ~7.000 líneas de dead code listas para eliminarse.

**Sin form (read-only en monolito):**
- Cupones — se crean automáticamente desde Ventas con tarjeta
- Cheques de Terceros — se crean automáticamente desde Cobros con cheque
- Cheques Propios — placeholder (sin tabla aún; se crearán desde OP de Compras)

**Permanecen embedded sin extraer:**
- Conciliación Bancaria, Conciliación de Tarjetas, Simulador — flujos con detail + matching, necesitan su propio diseño.

**Compras stubs sin data source real:** Legajos de Importación, Despachos Simples y Conciliación de Deuda quedan como redirect-stubs porque en el monolito sólo tienen `useState([])` sin `setX()` — son features placeholder que aún no están conectadas a Supabase. Extraerlas sin data sería deshonesto.

## Resumen del cleanup masivo post-PR-18 (sesión #49–65)

17 PRs adicionales después del cierre formal de la migración:

| PR | Descripción |
|----|-------------|
| #49 | Borrar dead code de `modulo-stock.tsx` + `modulo-taller.tsx` (-6334 lns) |
| #50 | Deduplicar `formatCurrency`/`formatDate` → `lib/format.ts` |
| #51 | Borrar `modulo-compras.tsx` (v1, -5624 lns) |
| #52 | Borrar render helpers muertos del módulo Taller en `page.tsx` (-1390 lns) |
| #53 | Ventas — extracción real de Notas de Venta |
| #54 | Ventas — extracción real de Órdenes de Entrega |
| #55 | Ventas — extracción real de Remitos |
| #56 | Ventas — extracción real de Facturas |
| #57 | Ventas — extracción real de Recibos (incluye nuevo `/api/recibos`) |
| #58 | Ventas — extracción real de Ajustes/NC/ND (3 vistas misma data) |
| #59 | Ventas — extracción real de Seña de Equipo |
| #60 | Ventas — configs (Categorías Cliente / NC-Cat / Criterios Cotizador) |
| #61 | Compras — Categorías de Proveedores + actualizar MIGRATION_STATUS |
| #62 | Home — dashboard limpio con KPIs reales (reemplaza modulo-home, -864 lns) |
| #63 | Cajas + Plan de Cuentas (primer Finanzas + primer Contabilidad) |
| #64 | Contabilidad — 6 configs (años/períodos/diarios/monedas/tipos cot/tipos cta) |
| #65 | Contabilidad — Asientos Manuales + Automáticos |

**Net en líneas: ~−12 000 dead code borrado, +5 000 código real de extracciones.**

## Migración de formularios

**Decisión del usuario (sesión post-PR-67):** migrar los forms de creación/edición a rutas propias top-level. La app está en construcción, no hay apuro, prioridad sentar bases bien.

### Forms de Ventas — COMPLETADOS (PRs #69-77)
Ver tabla detallada abajo. Después continúa con flujos cross-doc (#78-82) y luego Compras + Configs Ventas + Embedded refactor (#83-90).

### Resumen rápido de PRs #69-90

| PR | Módulo | Tipo |
|----|--------|------|
| #69 | Ventas | Form NV con cascada NV→OE→Remito→Factura |
| #70 | Ventas | Form Factura con confirmar IVA + recargos |
| #71 | API | Endpoints prep para Recibos (POST/PUT/publicar/cancelar) |
| #72 | Ventas | Form Recibo (usa endpoints de #71) |
| #73 | Ventas | Form OE |
| #74 | Ventas | Form Remito (con Confirmar al generar) |
| #75 | Ventas | Forms Ajustes/NC/ND parametrizado por tipo |
| #76 | Ventas | Form Seña |
| #77 | docs | Update MIGRATION_STATUS post-Ventas |
| #78 | Ventas fichas | Cross-doc: Factura→Registrar Cobro, Cancelar, etc. |
| #79 | Ventas fichas | Remito Confirmar/Cancelar + OE Generar Remito + cross-refs |
| #80 | Ventas | Confirmar Factura desde edit borrador |
| #81 | Ventas fichas | Acciones Seña: registrar pago, cierre, cancelar |
| #82 | layout | Topbar tabs apuntan a rutas nuevas |
| #83 | Compras | Form OC |
| #84 | Compras fichas | OC Confirmar + cross-refs Recepción/Factura |
| #85 | Compras | Form Factura Compra |
| #86 | Compras | Forms NC/ND Compra (cierra TODO del monolito) |
| #87 | Compras | Form OP |
| #88 | Compras | Form Categorías Proveedor |
| #89 | layout | Stubs mountan monolito inline (embedded) — URLs clean |
| #90 | Ventas | Forms Categorías Cliente + NC-Categorías |

**Estado funcional:** todas las URLs `/modulo/X` son limpias, sin redirects. Los forms más usados están migrados a Patrón A. Las vistas no migradas (cheques, conciliación bancaria, reportes contables, etc.) mountan el monolito inline en modo `embedded` — la URL queda limpia y la sidebar/topbar global se mantiene.

| PR | Entidad | Notas |
|----|---------|-------|
| #69 | **Notas de Venta** | Cascada NV → OE → Remito (confirmar) → Factura. Endpoint nuevo `PUT /api/notas-venta/[id]` para editar borradores. |
| #70 | **Facturas** | Cascada POST `abierta` → (opt) convertir-a-ars → POST `/confirmar`. Reusa `BloquesMediosPago`. PUT para editar borradores. |
| #71 | **Recibos — API endpoints** | Prep PR: `POST /api/recibos`, `PUT /api/recibos/[id]`, `POST /api/recibos/[id]/publicar`, `POST /api/recibos/[id]/cancelar`. Mueve toda la lógica multi-tabla y la cascada al servidor. |
| #72 | **Recibos — Form** | Form que usa los endpoints de #71. Sin acceso directo a supabase desde el cliente. Tabs Pagos + Comprobantes con CC bimonetaria. |
| #73 | **Órdenes de Entrega** | Form simple a partir de NV pendiente. |
| #74 | **Remitos** | Form a partir de OE pendiente, con toggle "Confirmar al generar" que descuenta stock + emite asiento CMV. Cierra el TODO ("Crear remito desde OE") del monolito. |
| #75 | **Ajustes / NC / ND** | 3 entidades en una PR (comparten tabla `ajustes_clientes`). Form parametrizado por `tipo`. |
| #76 | **Seña de Equipo** | Form con cascada server-side (crea seña + NV + OE) en `POST /api/senias-equipo`. Selector de IMEI/serie cuando el producto lo requiere. |

**Lo que queda en "Split entities"** (en `CLAUDE.md`):
- Categorías Cliente / NC-Categorías / Criterios Cotizador (configs) — fuera del scope del orden inicial.
- Compras: Categorías Proveedores.
- Finanzas: Cajas.
- Contabilidad: Plan de Cuentas, Asientos Manuales/Automáticos, 6 configs.

**Lo que queda por hacer en Ventas (no urgente):**
- Form de Categorías Cliente, NC-Categorías, Criterios Cotizador.
- Borrar el dead code de los `renderXxx`/`handleXxx` correspondientes en `ventas-module.tsx` cuando se confirme cero bug.

### Patrón A — MVP por entidad, sin tocar el monolito

Para cada entidad partida, crear:

1. `components/<modulo>/<entidad>-form.tsx` — componente standalone que:
   - Carga sus propios datos de las APIs (clientes, productos, listas, depósitos, etc).
   - Si recibe `initialId`, fetchea la entidad y la carga como modo "editar".
   - Renderiza el form con la misma UI/validaciones que el monolito.
   - Al guardar: llama a las mismas APIs (`POST /api/notas-venta`, etc.).
   - Al éxito: `router.push("/<modulo>/<entidad>/[id]")` (la ficha read-only ya extraída).
2. `app/(dashboard)/<modulo>/<entidad>/nueva/page.tsx` — monta `<EntidadForm />` (reemplaza el redirect-stub actual).
3. `app/(dashboard)/<modulo>/<entidad>/[id]/editar/page.tsx` — monta `<EntidadForm initialId={id} />` (nueva ruta).
4. Actualizar el botón "Nueva X" del listado: cambiar `href="/?module=X&view=Y"` por `href="/<modulo>/<entidad>/nueva"`.
5. Actualizar el link "Editar en módulo X" de la ficha: cambiar a `/<modulo>/<entidad>/[id]/editar`.

**Importante (regla del Patrón A):** **NO se toca el monolito**. El form en `ventas-module.tsx` etc. queda intacto. Si el form nuevo tuviera un bug grave, el usuario puede volver al monolito (manualmente con `?module=ventas&view=notas_venta` o agregando temporalmente el link viejo). Cero riesgo de regresión en lo crítico.

**Cuando bug zero confirmado:** en una sesión posterior, sacar `renderXxx()` y `handleXxxFinal()` del monolito (dead code real). Eso es trivial y reversible.

### Decisión sobre el alcance del form (cascada vs MVP)

Algunos forms (especialmente NV) hacen **cascada de múltiples llamadas HTTP** al guardar. Por ejemplo, "Crear NV venta inmediata" hoy hace:
1. `POST /api/notas-venta`
2. `POST /api/ordenes-entrega`
3. `POST /api/remitos-venta`
4. `POST /api/remitos/{id}/confirmar` (descuenta stock + asiento)
5. `POST /api/facturas` (asiento contable)

**Decisión:** la PR de cada form debe replicar la cascada **completa** del monolito. No hacer MVP-solo-borrador. El usuario validará vía UI después.

Si la cascada se vuelve frágil para una entidad puntual (ej. order matters, falla parcial deja inconsistencia), parar antes del merge y consultar.

### Después de Ventas (próximas fases)

- Compras: Categorías Proveedores (1 entidad). Las otras 3 (Legajos/Despachos/Conciliación) quedan como redirects hasta que tengan data real.
- Finanzas: Cajas (1 form simple). El resto, cuando se migren los listados, irá con el form en la misma PR.
- Contabilidad: Plan de Cuentas + Asientos Manuales. Las configs simples (años/períodos/etc) son CRUD chico y van fácil. Asientos Manuales sí necesita pensarse (debe = haber, validaciones).

### Regla a futuro (post-migración)

Cuando todos los forms estén en rutas propias, agregar a `CLAUDE.md`:
- *"Cualquier feature nueva que requiera un formulario va a su ruta top-level. No se mete código nuevo en `ventas-module.tsx`, `modulo-compras-v2.tsx`, `modulo-finanzas.tsx`, `modulo-contabilidad.tsx`. Esos archivos están en proceso de retirarse — no crecen más."*

Y entonces empieza el delete-fest del monolito.

## Convenciones (siguen aplicando)

- Cada page es client component (`"use client"`) con permission guard `useEffect(() => { if (!canSee("modulo", "subview")) router.replace("/") }, ...)`
- Topbar global vive en `(dashboard)/layout.tsx`. Las pestañas son Links para módulos migrados y `/?module=X` para los que siguen en el monolito.
- Cada módulo tiene su `components/sidebars/<modulo>-config.ts` y un layout `(dashboard)/<modulo>/layout.tsx` que usa `<ModuleSidebar config={...}>`.
- Los redirect-stubs llaman a `<ModuloRedirectStub view="X" permKey="Y" />` y el monolito sincroniza `?view=` con su `activeView` interno vía `useSearchParams()`.
