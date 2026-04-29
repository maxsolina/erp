# ROUTING AUDIT — CellHome ERP

Fecha: 2026-04-29
Estado: **propuesta para revisión** — no se tocó código aún.

---

## 1. Resumen ejecutivo

El ERP hoy es una **única página de Next.js** (`app/page.tsx`, 3.8K líneas) que monta todos los módulos como componentes React. La navegación entre módulos, sub-vistas, listados, fichas y formularios funciona **por estado en memoria** (`useState`), no por URL.

Esto significa, en concreto, que:

- Si recargás el navegador en cualquier pantalla → volvés siempre al Home.
- No podés copiar el link de una factura, un producto o cualquier registro y mandárselo a un colega.
- Ctrl+Click sobre una fila no abre nada en una pestaña nueva (porque no hay URL).
- Los botones "atrás" y "adelante" del navegador no funcionan.
- Los breadcrumbs son literales escritos a mano (no se generan de la URL).
- El menú de "favoritos / abrir en otra pestaña" del navegador no sirve para nada.

La migración propuesta convierte cada listado, cada ficha y cada formulario en una **página real de Next.js con su propia URL**, manteniendo intacta la lógica de negocio.

**Tamaño del cambio**: alto. Son ~60K líneas de código que se reorganizan, aunque mucho se mueve sin reescribirse.

---

## 2. Estado actual

### 2.1 Archivos de routing existentes

```
app/
├── layout.tsx              # html/body, font, analytics
├── page.tsx                # ← TODO el ERP, 3840 líneas
├── circuitos/page.tsx      # documentación de flujos
├── reset-password/page.tsx # recuperar contraseña (lo agregamos hace poco)
└── api/                    # endpoints REST (~80, bien estructurados)
```

Solo hay **4 páginas reales** (las URLs `/`, `/circuitos`, `/reset-password` y la layout root). Todo el resto es estado interno.

### 2.2 Cómo navega el ERP hoy

Todo se decide con dos `useState` adentro de `app/page.tsx`:

```ts
const [activeModule, setActiveModule] = useState("home")
const [activeView, setActiveView] = useState("dashboard")
```

- **`activeModule`**: `"home" | "ventas" | "compras" | "stock" | "finanzas" | "contabilidad" | "deposito" | "informes" | "config" | "taller"`
- **`activeView`**: lo que se muestra adentro del módulo (ej. `"notas_venta"`, `"facturas"`, `"recibos"`, etc.)

Cuando hacés click en un módulo del topbar → `setActiveModule(...)`. Cuando hacés click en un item del sidebar interno → `setActiveView(...)`. **Nada toca la URL.**

### 2.3 Cómo se navega a una ficha o un formulario

Cada módulo tiene su propio set de variables de estado para abrir registros. En **Ventas** (16K líneas), por ejemplo:

```ts
const [selectedNV, setSelectedNV]             = useState<NotaVenta | null>(null)
const [selectedOE, setSelectedOE]             = useState<OrdenEntrega | null>(null)
const [selectedFactura, setSelectedFactura]   = useState<Factura | null>(null)
const [selectedRemito, setSelectedRemito]     = useState<Remito | null>(null)
const [selectedRecibo, setSelectedRecibo]     = useState<Recibo | null>(null)
const [selectedListaPrecios, setSelectedListaPrecios] = useState(...)
// ... + 7 más

const [creandoNV, setCreandoNV]               = useState(false)
const [creandoOE, setCreandoOE]               = useState(false)
const [creandoFactura, setCreandoFactura]     = useState(false)
const [creandoRecibo, setCreandoRecibo]       = useState(false)
const [creandoCategoria, setCreandoCategoria] = useState(false)
const [creandoListaPrecios, setCreandoListaPrecios] = useState(false)
const [creandoVersion, setCreandoVersion]     = useState(false)
const [creandoSenia, setCreandoSenia]         = useState(false)
```

Patrón general: para abrir un registro hacés `setSelectedX(registro)`. Para crear, `setCreandoX(true)`. El componente padre lee esos flags y renderiza el ficha/form correspondiente.

### 2.4 Modales vs fichas full-page

Hay **inconsistencia**:

- Algunos formularios son **modales** (cliente, recibo, ajuste antes — ya migrado a full-page).
- Otros son **fichas full-page** dentro del mismo componente (NV, factura, OE, remito, usuario).
- El modal de "Cliente nuevo" sigue siendo modal.

La propuesta del prompt dice: **NO modales para edición/creación de registros importantes**. Cada formulario es su propia página.

### 2.5 Filtros y paginación

Cada listado usa `<OdooFilterBar>` con filtros guardados en estado del cliente (`activeFilters`, `searchQuery`, `activeGroupBy`). **Nada se persiste en la URL**, así que si pegás un link no llevás los filtros.

### 2.6 Permisos (recientemente implementados)

Acabamos de armar (PR 0–6) un sistema de permisos por usuario que filtra topbar y sidebars vía un helper `canSee(modulo, subvista?)` del contexto. **Esta lógica TIENE QUE seguir funcionando** después de la migración: las páginas nuevas tienen que respetar `canSee` igual que los sidebars actuales.

---

## 3. Inventario por módulo

Para cada módulo: cuántas pantallas tiene, cuáles son listados/fichas/formularios, y la propuesta de URL.

### 3.1 Productos (más simple, prioridad #1)

- **1 listado** con filtros y búsqueda.
- **1 ficha** del producto (con tabs internas: General, Stock, Precios, Histórico).
- **1 formulario nuevo / editar** (en estado, no modal).

| Hoy | Mañana |
|-----|--------|
| `activeModule="deposito"` + `activeView="productos"` + estado interno | `/productos` |
| `setSelectedProducto(p)` | `/productos/[id]` |
| `setEditingProducto(p)` (estado) | `/productos/[id]/editar` |
| `setCreandoProducto(true)` | `/productos/nuevo` |

### 3.2 Ventas (el más grande — 16K líneas, prioridad #2)

Tiene 7 secciones de sidebar:

- **Clientes**: listado / ficha / nuevo / editar (modal hoy)
- **Conciliación de Deuda**: pantalla única con flujo
- **Ajustes de Cliente**: listado / ficha (recién migramos a full-page)
- **Notas de Venta**: listado / ficha / nuevo (full-page)
- **Toma de Equipo**: listado / ficha / nuevo
- **Seña de Equipo**: listado / ficha / nuevo
- **Órdenes de Entrega**: listado / ficha / nuevo
- **Remitos**: listado / ficha / nuevo
- **Facturas**: listado / ficha / nuevo
- **Notas de Crédito / Débito**: listado / ficha (compartido con Ajustes)
- **Recibos**: listado / ficha / nuevo
- **Listas de Precios**: listado / ficha / editar / nueva
- **Versiones de Lista**: listado / ficha / editar / nueva
- **Categorías de Cliente**: listado / ficha / editar / nueva
- **Categorías de NC**: listado simple

| Hoy | Mañana |
|-----|--------|
| `activeView="listado"` (clientes) | `/ventas/clientes` |
| `selectedCliente` | `/ventas/clientes/[id]` |
| `creandoCliente` | `/ventas/clientes/nuevo` |
| `activeView="notas_venta"` | `/ventas/nv` |
| `selectedNV` | `/ventas/nv/[id]` |
| `creandoNV` | `/ventas/nv/nuevo` |
| `activeView="ordenes_entrega"` | `/ventas/oe` |
| `selectedOE` | `/ventas/oe/[id]` |
| `activeView="remitos"` | `/ventas/remitos` |
| `selectedRemito` | `/ventas/remitos/[id]` |
| `activeView="facturas"` | `/ventas/facturas` |
| `selectedFactura` | `/ventas/facturas/[id]` |
| `activeView="recibos"` | `/ventas/recibos` |
| `selectedRecibo` | `/ventas/recibos/[id]` |
| `activeView="notas_credito"` | `/ventas/nc` |
| `selectedAjuste` (NC seleccionada) | `/ventas/nc/[id]` |
| `activeView="notas_debito"` | `/ventas/nd` |
| `activeView="ajustes"` | `/ventas/ajustes` |
| `selectedAjuste` | `/ventas/ajustes/[id]` |
| `activeView="conciliacion"` | `/ventas/conciliacion` |
| `activeView="toma_equipo"` | `/ventas/toma-equipo` |
| `selectedToma` | `/ventas/toma-equipo/[id]` |
| `activeView="senia_equipo"` | `/ventas/senia-equipo` |
| `selectedSenia` | `/ventas/senia-equipo/[id]` |
| `activeView="listas_precios"` | `/listas-precios` (top-level según prompt) |
| `selectedListaPrecios` | `/listas-precios/[id]` |
| `activeView="versiones_lista"` | `/listas-precios/versiones` |
| `selectedVersion` | `/listas-precios/versiones/[id]` |
| `activeView="categorias_cliente"` | `/ventas/categorias-cliente` |
| `activeView="criterios_cotizador"` | `/ventas/criterios-cotizador` |
| `activeView="nc_categorias"` | `/ventas/nc-categorias` |

### 3.3 Compras (~9K líneas, prioridad #3)

Sub-secciones del sidebar:

- **Proveedores**: listado / ficha / nuevo / editar / Cuenta Corriente / Historial / Conciliación
- **Compras**: Órdenes de Compra (listado/ficha/nuevo), Recepciones
- **Comprobantes**: Facturas, NC compra, ND compra, Legajos importación, Despachos simples
- **Pagos**: Órdenes de Pago

| Hoy | Mañana |
|-----|--------|
| `activeView="proveedores"` | `/compras/proveedores` (o `/proveedores` top-level) |
| ficha proveedor (estado) | `/compras/proveedores/[id]` |
| `cta_cte_proveedores` | `/compras/proveedores/[id]/cta-cte` |
| `historial_proveedores` | `/compras/proveedores/[id]/historial` |
| `conciliacion_deuda` | `/compras/conciliacion-deuda` |
| `ordenes_compra` | `/compras/oc` |
| selectedOC | `/compras/oc/[id]` |
| nuevoOC | `/compras/oc/nuevo` |
| `recepciones` | `/compras/recepciones` |
| `recepcionSeleccionada` | `/compras/recepciones/[id]` |
| `facturas_compra` | `/compras/facturas` |
| selectedFacturaCompra | `/compras/facturas/[id]` |
| `nc_compra` | `/compras/nc` |
| `nd_compra` | `/compras/nd` |
| `legajos_importacion` | `/compras/legajos` |
| `despachos_simples` | `/compras/despachos-simples` |
| `ordenes_pago` | `/compras/op` |
| `cat_proveedores` | `/compras/categorias-proveedores` |

### 3.4 Stock (4.9K líneas, prioridad #6)

| Hoy | Mañana |
|-----|--------|
| `activeView="productos"` | `/stock/productos` (o el `/productos` top-level) |
| `transferencias` | `/stock/transferencias` |
| selectedTransferencia / creandoTransferencia | `/stock/transferencias/[id]` y `/nuevo` |
| `pedidos_abastecimiento` | `/stock/pedidos-abastecimiento` |
| `lotes_series` | `/stock/lotes-series` |
| `lotes_stock` | `/stock/imei` |
| `control_inventario` | `/stock/control-inventario` |
| `ajustes_positivos` | `/stock/ajustes/positivos` |
| `ajustes_negativos` | `/stock/ajustes/negativos` |
| `cubo_stock` | `/stock/cubo` |
| `stock_reservado` | `/stock/reservado` |
| `config_*` (7 vistas de configuración) | `/stock/config/[item]` |

### 3.5 Finanzas (9.7K líneas, **NO está en la prioridad de la Fase 4 del prompt**)

Tiene 5 secciones con ~25 sub-vistas. El prompt original no lista Finanzas en la lista de migración. **Decisión necesaria**: ¿se migra Finanzas o se deja para después?

### 3.6 Contabilidad (2.4K líneas, **tampoco en el orden del prompt**)

5 secciones con 24 sub-vistas. Misma decisión que Finanzas.

### 3.7 Servicio Técnico / Taller (1.4K líneas, prioridad #8)

- Dashboard, Órdenes de Trabajo, Catálogos (Técnicos / Equipos / Fallas), Configuración (Áreas / Categorías / Tipos OT / Fallas-equipo / Turnos / Feriados / Controles / Motivos cierre), Kanban Técnicos.

| Hoy | Mañana |
|-----|--------|
| `view="dashboard"` | `/servicio-tecnico` (dashboard como home del módulo) |
| `view="ordenes"` | `/servicio-tecnico/ot` |
| `selectedOT` | `/servicio-tecnico/ot/[id]` |
| `view="nueva_ot"` | `/servicio-tecnico/ot/nueva` |
| `view="kanban"` | `/servicio-tecnico/kanban` |
| Todos los `cat_*` y `cfg_*` | `/servicio-tecnico/[item]` |

### 3.8 Toma de Equipo (prioridad #7)

Vive parte adentro de Ventas y parte como módulo independiente. **Decisión necesaria**: ¿quedaría como sub-ruta de Ventas (`/ventas/toma-equipo`) o como ruta top-level (`/toma-equipo`) como dice el prompt?

### 3.9 Listas de Precios (prioridad #4)

Hoy es una sub-vista de Ventas. El prompt propone `/listas-precios` como **top-level**. Eso reorganiza el menú: deja de estar en el sidebar de Ventas y pasa al topbar (probablemente bajo Config) o queda accesible solo por URL/permisos.

### 3.10 Proveedores (prioridad #5)

Mismo caso: hoy es sub-vista de Compras, el prompt lo propone top-level (`/proveedores`).

### 3.11 Sucursales (prioridad #5)

Hoy vive en `Config → Sucursales`. El prompt lo propone como `/sucursales/[id]`. **Decisión**: ¿queda bajo Config o se separa?

### 3.12 Usuarios (recién hecho, NO está en el prompt)

Acabamos de armarlo bajo Config → Usuarios. La estructura es idéntica al patrón propuesto: listado + ficha + crear.

| Hoy | Mañana |
|-----|--------|
| `activeView="usuarios"` (Config) | `/config/usuarios` o `/usuarios` |
| `seleccionadoId` | `/.../usuarios/[id]` |
| `creandoNuevo` | `/.../usuarios/nuevo` |

### 3.13 Informes / Productos / Home

Son pantallas únicas, no necesitan rutas dinámicas. Con `/informes`, `/productos` y `/` alcanza.

---

## 4. Mapping consolidado de URLs propuestas

(Solo paths visibles para el usuario, no API.)

```
/                                       Home / Dashboard
/login                                  (no existe hoy, ver decisión #2)
/reset-password                         (ya existe)

/productos                              Listado
/productos/nuevo
/productos/[id]                         Ficha (read)
/productos/[id]/editar                  Form de edición

/ventas/clientes                        Listado
/ventas/clientes/nuevo
/ventas/clientes/[id]
/ventas/conciliacion
/ventas/ajustes
/ventas/ajustes/[id]
/ventas/nv                              Notas de Venta
/ventas/nv/nuevo
/ventas/nv/[id]
/ventas/oe                              Órdenes de Entrega
/ventas/oe/[id]
/ventas/remitos
/ventas/remitos/[id]
/ventas/facturas
/ventas/facturas/[id]
/ventas/recibos
/ventas/recibos/[id]
/ventas/nc                              Notas de Crédito
/ventas/nc/[id]
/ventas/nd                              Notas de Débito
/ventas/nd/[id]
/ventas/toma-equipo
/ventas/toma-equipo/[id]
/ventas/senia-equipo
/ventas/senia-equipo/[id]
/ventas/categorias-cliente
/ventas/criterios-cotizador
/ventas/nc-categorias

/compras/proveedores                    Listado proveedores
/compras/proveedores/nuevo
/compras/proveedores/[id]
/compras/proveedores/[id]/cta-cte       Tabs adentro
/compras/proveedores/[id]/historial
/compras/conciliacion-deuda
/compras/oc
/compras/oc/nuevo
/compras/oc/[id]
/compras/recepciones
/compras/recepciones/[id]
/compras/facturas
/compras/facturas/[id]
/compras/nc
/compras/nd
/compras/legajos
/compras/legajos/[id]
/compras/despachos-simples
/compras/despachos-simples/[id]
/compras/op
/compras/op/[id]
/compras/categorias-proveedores

/stock                                  Dashboard del módulo
/stock/productos                        ← redundante si /productos top-level
/stock/transferencias
/stock/transferencias/[id]
/stock/pedidos-abastecimiento
/stock/lotes-series
/stock/imei
/stock/control-inventario
/stock/ajustes/positivos
/stock/ajustes/negativos
/stock/cubo
/stock/reservado
/stock/config/depositos
/stock/config/ubicaciones
/stock/config/categorias
/stock/config/tipos-operacion
/stock/config/posiciones
/stock/config/rutas
/stock/config/reglas

/finanzas/...                           (25 sub-rutas — ver decisión #1)
/contabilidad/...                       (24 sub-rutas — ver decisión #1)
/informes                               Pantalla única

/servicio-tecnico                       Dashboard
/servicio-tecnico/ot
/servicio-tecnico/ot/nueva
/servicio-tecnico/ot/[id]
/servicio-tecnico/kanban
/servicio-tecnico/tecnicos
/servicio-tecnico/equipos
/servicio-tecnico/fallas
/servicio-tecnico/areas
/servicio-tecnico/categorias
/servicio-tecnico/tipos-ot
/servicio-tecnico/fallas-equipo
/servicio-tecnico/turnos
/servicio-tecnico/feriados
/servicio-tecnico/controles
/servicio-tecnico/motivos-cierre

/config/sucursales
/config/sucursales/[id]
/config/usuarios
/config/usuarios/nuevo
/config/usuarios/[id]
```

Total estimado: **~120 rutas nuevas**.

---

## 5. Riesgos y bloqueantes

### 5.1 La autenticación se rompe si no se planifica

Hoy `app/page.tsx` se envuelve con `<ERPWrapper>` que monta `<ERPProvider>` (todo el contexto: usuario, sucursales, permisos). El gate de `isAuthenticated` está adentro de ese wrapper. Si separamos cada ruta como una página independiente, el provider tiene que vivir en el `layout.tsx` superior, NO en cada page.

Decisión obligada: **`app/(dashboard)/layout.tsx`** tiene que envolver TODAS las rutas internas con `ERPProvider` y el gate de auth. Las rutas públicas (`/login`, `/reset-password`) quedan AFUERA del layout group.

### 5.2 Server Components vs Client Components

El prompt dice "fetch del lado del servidor cuando sea posible (RSC)". **Conflicto**: hoy todo el ERP es cliente (`"use client"`) y usa el `useERP()` context. Para usar RSC tenemos que:
- O bien dejar todas las páginas como Client Components (más simple, menor cambio)
- O bien refactorizar mucho: las páginas son RSC, los componentes interactivos se marcan `"use client"`, y los datos llegan como props

Para mantener el alcance acotado, **propongo Client Components por ahora** (es la situación de hoy), con `"use client"` arriba. Migrar a RSC se puede hacer en una segunda pasada. Si decidís ir RSC desde el día 1, el alcance crece bastante.

### 5.3 La estructura monolítica de los archivos grandes

`ventas-module.tsx` (16K líneas) y `modulo-compras-v2.tsx` (9.7K líneas) tienen TODO el código de cada módulo en un solo archivo. Para migrar a rutas separadas necesitamos:

- Extraer cada listado a su propia página
- Extraer cada ficha a su propia página
- Extraer cada formulario de creación a su propia página
- Mover los handlers, las queries y los renders

Es trabajo mecánico pero invasivo. Cada extracción puede traer bugs si se rompe un dependency interno (ej. el padre pasaba un callback al hijo).

### 5.4 La cascada de permisos recién implementada

Acabamos de armar el sistema de permisos que filtra topbar y sidebars con `canSee()`. **Cada página nueva tiene que respetar esto** o usuarios no superusuarios podrían acceder a URLs prohibidas escribiéndolas a mano.

Solución: agregar un check `canSee()` al inicio de cada page (o a un middleware/guard del `(dashboard)/layout.tsx` que decida si redirigir al home).

### 5.5 Filtros guardados en estado del cliente

Los `<OdooFilterBar>` actuales guardan filtros en `useState`. El prompt pide moverlos a `searchParams`. Esto **es un cambio en cada listado** (no es solo cambiar URLs, hay que reescribir el filterBar para leer/escribir searchParams).

### 5.6 Los modales que quedan

Tras la última pasada quedan algunos modales (cliente nuevo, NV nueva en ciertos flujos). El prompt dice "página entera, no modales". Hay que migrarlos a rutas. **Hay decisiones de UX**: por ejemplo, el modal de "Cliente Nuevo" desde el form de NV es práctico — convertirlo en página entera implica perder el contexto del NV en curso. La alternativa son **intercepting routes** (más complejas).

### 5.7 La carga inicial de datos masiva

Hoy `<ERPProvider>` carga AL ARRANCAR un montón de datos (clientes, productos, sucursales, monedas, etc.). Si dejamos esa carga en el layout `(dashboard)`, sigue funcionando como antes. Pero si queremos que cada página fetcche solo lo que necesita (más limpio, más rápido), eso es **otra refactorización aparte** que cambia mucho.

Recomiendo mantener el provider como está, al menos para esta migración.

### 5.8 Bugs encontrados durante el audit (irán a `BUGS_ENCONTRADOS.md` si arrancamos)

Hasta acá no encontré ninguno bloqueante. Quedó pendiente del PR anterior:

- Items hardcodeados en sidebars que no pasaron por el catálogo (ya corregidos)
- Múltiples instancias de `GoTrueClient` warnings en consola (no rompe pero ensucia)

---

## 6. Decisiones que necesito antes de migrar

Te las pongo todas en una lista para que elijas:

### Decisión 1: Alcance de la migración

El prompt lista 8 módulos en la Fase 4. **NO incluye** Finanzas, Contabilidad ni Informes.

Opciones:
- **A**: Migrar solo los 8 listados. Finanzas/Contabilidad/Informes quedan como páginas únicas (ej. `/finanzas` que internamente sigue siendo el monolito de hoy con su sidebar interno). URL no granular.
- **B**: Migrar TODO con el mismo patrón. Más trabajo pero consistente.

### Decisión 2: Login + página pública

Hoy el login está embebido (componente `LoginPage` que se muestra cuando `isAuthenticated === false`). En el patrón Next.js, lo natural es `/login` como ruta separada.

Opciones:
- **A**: Crear `/login` como ruta real. Mover la lógica del wrapper allí. (Recomendado, más estándar.)
- **B**: Dejar el patrón actual. El login sigue siendo conditional en el dashboard layout.

### Decisión 3: Productos top-level vs Stock

El prompt propone `/productos` top-level. Hoy productos vive bajo Stock. ¿Movemos productos a top-level y se deja `/stock` solo para movimientos/transferencias? ¿O mantenemos `/stock/productos`?

### Decisión 4: Listas de precios y Proveedores

Idem: ¿top-level o sub-ruta?

### Decisión 5: Server Components vs Client Components

Como expliqué en 5.2: ir 100% RSC duplica el alcance. Mi recomendación es **Client Components** ahora, RSC en una segunda pasada.

### Decisión 6: Filtros en URL

Migrar `<OdooFilterBar>` a `searchParams` es ~2-4 horas adicionales por listado. Hay ~30 listados. Eso son 60-120 horas extra. ¿Lo metemos ahora o lo difiero para otro PR?

### Decisión 7: Modales restantes

¿Migramos TODOS los modales a páginas (siguiendo el prompt al pie de la letra) o conservamos algunos por UX (ej. "Cliente Nuevo" desde NV)?

### Decisión 8: Path de la migración

El prompt dice "un módulo por commit, validá que funcione, avisame antes de pasar al siguiente". **Confirmo este flujo**. ¿Vamos en el orden propuesto (Productos primero) o cambiamos prioridades?

---

## 7. Estimación rough de tiempo

Con Client Components, sin cambiar filtros a searchParams, manteniendo el provider central:

| Bloque | Estimación |
|--------|-----------|
| Setup `(dashboard)/layout.tsx` + login + auth gate | 2–4 hs |
| Productos | 2–4 hs |
| Ventas (NV + OE + Remitos) | 8–12 hs |
| Resto de Ventas (facturas, recibos, ajustes, NC/ND, listas, conciliación, etc.) | 8–12 hs |
| Compras (todo) | 10–15 hs |
| Listas de precios + Proveedores + Sucursales | 4–6 hs |
| Stock (todo) | 6–10 hs |
| Toma de equipo | 2–3 hs |
| Servicio Técnico | 4–6 hs |
| Migración filtros a searchParams (si elegida) | +30–60 hs |
| Migración a RSC (si elegida) | +40–80 hs |
| Testing y arreglos | 6–10 hs por módulo grande |

**Total mínimo: ~50–80 horas** (Client Components, sin filtros en URL).
**Total con todo el spec: ~150–250 horas**.

---

## 8. Plan recomendado

1. **Aprobamos este audit** y las decisiones del punto 6.
2. **PR setup** (~3hs): Crear `app/(dashboard)/layout.tsx`, mover el ERPProvider y el shell del topbar a ese layout. Crear `/login` y mover la lógica. Validar que todo siga andando como hoy con el viejo `/page.tsx` adentro.
3. **PR 1: Productos** (~3hs): Migrar `/productos` y sub-rutas. Validar.
4. **PR 2: Ventas — Notas de Venta** (~6hs): Solo NV. Validar.
5. **PR 3: Ventas — OE + Remitos**.
6. **PR 4: Ventas — Facturas + Recibos**.
7. ... y así sucesivamente, un módulo (o sub-módulo si es muy grande) por PR.
8. **PR final**: `MIGRATION_NOTES.md` con resumen + redirects desde URLs viejas si hace falta.

Cada PR queda **mergeado y andando** antes de pasar al siguiente. Cero "big bang".

---

## 9. Próximo paso

Necesito que respondas las **8 decisiones** del punto 6 (o me digas "decidí vos las que sean razonables") para poder arrancar. Sin esas respuestas no puedo escribir el setup inicial.

Si querés podemos arrancar **solo con la decisión 1** y vamos resolviendo las otras a medida que las necesitamos.
