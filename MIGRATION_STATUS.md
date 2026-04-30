# Estado de la migración a Routing limpio (App Router)

Última actualización: 2026-04-29 — PR 9 completado (módulo Stock 100% migrado)

## Decisiones aprobadas (no volver a preguntar)

1. **Alcance**: TODOS los módulos.
2. **Login**: ruta separada `/login` (ya hecho).
3. **Top-level**: productos, listas-precios, proveedores, sucursales son top-level (no anidados en stock/ventas/compras).
4. **Components**: Client Components ahora. RSC en una segunda pasada.
5. **Filtros**: NO migramos a `searchParams` en este pase (lo difiero).
6. **Modales**: TODOS los formularios pasan a páginas (excepto modales secundarios tipo "Usuarios asignados a sucursal" que es una vista, no un form principal).
7. **Orden**: el definido en el todo list (abajo).
8. **Cleanup**: las funciones `render*` viejas en los monolitos (`ventas-module.tsx`, `modulo-compras-v2.tsx`, etc.) se quedan como **dead code** durante la migración. Limpieza completa al final (PR 19).

## PRs completados

- ✅ **PR 0 — Setup**: `app/(dashboard)/layout.tsx` con auth gate + sucursal selector + user menu. `app/login/page.tsx`. `ERPProvider` movido a root layout. `app/page.tsx` movido a `app/(dashboard)/page.tsx` (sigue siendo el monolito por ahora).
- ✅ **PR 1 — Productos**: `/productos`, `/productos/nuevo`, `/productos/[id]`. Stock sidebar tiene Link a `/productos`, default `activeView` cambió a `"transferencias"`. `renderProveedores`/`renderFichaProveedor` en stock quedan dead code.
- ✅ **PR 2 — Sucursales**: `/sucursales`, `/sucursales/nueva`, `/sucursales/[id]` (con modal `PanelUsuarios`). Sidebar de Config → Link a `/sucursales`. `<ModuloConfigSucursales />` ya no se renderiza inline.
- ✅ **PR 3 — Usuarios**: `/usuarios`, `/usuarios/nuevo`, `/usuarios/[id]` (con tabs Configuraciones/Accesos/Permisos/Sesiones). Sidebar de Config → Link. `<ModuloUsuarios />` ya no se renderiza inline. `FichaUsuario`, `FichaCrearUsuario`, `Avatar`, `formatRelative`, `UsuarioRow` exportados.
- ✅ **PR 4 — Proveedores**: extracción a `components/proveedores/` (listado.tsx, ficha.tsx, formulario.tsx). Páginas en `/proveedores`, `/proveedores/nuevo`, `/proveedores/[id]`, `/proveedores/[id]/editar`. Sidebar de Compras → Link. Default `activeView` de Compras cambió a `"ordenes_compra"`.
- ✅ **PR 5 — Listas de Precios**: extracción a `components/listas-precios/` (8 archivos: listado, ficha, formulario, version-ficha, version-formulario, versiones-listado, _shared, seguimiento-panel). Páginas en `/listas-precios`, `/nueva`, `/[id]`, `/[id]/editar`, `/[id]/versiones/nueva`, `/[id]/versiones/[vid]`, `/[id]/versiones/[vid]/editar`, `/versiones`. Sidebar de Ventas → Links. Cases sacados del `renderContent` switch.
- ✅ **PR 6 — Toma de Equipo**: extracción a `components/toma-equipo/` (4 archivos: `_shared.ts`, `listado.tsx`, `ficha.tsx`, `formulario.tsx`). Páginas en `/toma-equipo`, `/toma-equipo/nueva`, `/toma-equipo/[id]` (top-level, no anidado en Ventas). Sidebar de Ventas → Link. Case sacado del `renderContent` switch. Modal de "confirmar recepción" + popups de NC y Recepción viajan dentro de `ficha.tsx`. Estados `tomaEquipo*`, `selectedToma`, `tomasEquipo`, `showConfirmarRecepcionModal` y los renders viejos quedan **dead code** en `ventas-module.tsx`.
- ✅ **PR 7 — Servicio Técnico (Taller)**: módulo completo a `/servicio-tecnico/...` (16 rutas). Componentes en `components/servicio-tecnico/` (`_shared.tsx` con tipos+constantes+`CRUDTableWithFilter`, `dashboard.tsx`, `kanban.tsx`, `ot-listado.tsx` con modal Asignador, `ot-formulario.tsx`, `ot-ficha.tsx` con state machine + modal Cancelar). `app/(dashboard)/servicio-tecnico/layout.tsx` con sidebar interno (Principal / Catálogos / Configuración / Vistas). Topbar "Taller" en `(dashboard)/page.tsx` ahora es `<Link>`. **Limitación heredada**: los modales de crear/editar de los 11 catálogos/config ya estaban a medio implementar en el monolito (sólo seteaban estado, no renderizaban modal). Mantuvimos ese comportamiento — listar y borrar funciona, crear/editar muestra alert "pendiente de UI dedicada". Todo el `modulo-taller.tsx` queda **dead code** (limpieza en PR 19).

- ✅ **PR 8 — Stock parte 1 (operativo)**: 5 rutas a `/stock/...`. Componentes en `components/stock/` (`_shared.tsx` con tipos + helpers de estado + `SeguimientoPanel` + persistencia en `sessionStorage`, `dashboard.tsx`, `transferencias-listado.tsx`, `transferencias-ficha.tsx`, `transferencias-formulario.tsx`, `pedidos-listado.tsx`). `app/(dashboard)/stock/layout.tsx` con sidebar de items migrados. Sidebar de `modulo-stock.tsx` → Links para transferencias y pedidos. Cases sacados del switch.
- ✅ **PR 9 — Stock parte 2 + topbar global**: 14 rutas nuevas a `/stock/...` — Trazabilidad (`lotes-series`, `imei`), Control (`control-inventario`, `ajustes/positivos`, `ajustes/negativos`), Informes (`cubo`, `reservado`) y Configuración (`config/depositos`, `config/ubicaciones`, `config/categorias`, `config/tipos-operacion`, `config/posiciones`, `config/rutas`, `config/reglas`). Componentes nuevos en `components/stock/`: `lotes-listado.tsx` (con agrupación multinivel completa, cubre lotes-series e IMEI vía prop `dataset`), `control-inventario-listado.tsx`, `ajustes-listado.tsx` (cubre positivos/negativos vía prop `tipo`), `cubo.tsx` (versión simplificada — KPIs + matriz Producto×Depósito; el pivot interactivo con drag-and-drop queda pendiente de migración futura), `reservado-listado.tsx` (con fetch a `/api/stock/unidades?estado=reservado`), `config-depositos-listado.tsx`, `config-ubicaciones-listado.tsx`, `config-categorias-listado.tsx`. Las 4 páginas mock (`tipos-operacion`, `posiciones`, `rutas`, `reglas`) tienen sus datos hardcodeados inline. `_shared.tsx` extendido con interfaces (`LoteSerie`, `ControlInventario`, `AjusteInventario`, `CategoriaUbicacion`), helpers (`getEstadoControlColor`, `mapLoteSerie`) y `StockListSection`. Layout `(dashboard)/stock/layout.tsx` extendido con sidebar completo (Principal / Productos / Operaciones / Trazabilidad / Control / Informes / Configuración). **Cierre del módulo**: topbar "Deposito" en `(dashboard)/page.tsx` ahora es `<Link href="/stock">` (desktop + mobile). El render `activeModule === "deposito"` con `<ModuloStock />` fue eliminado. Import de `ModuloStock` en `(dashboard)/page.tsx` removido. **Todo `components/modulo-stock.tsx` queda 100% dead code** (no se reemplazó el sidebar interno ni se sacaron cases del switch — limpieza completa en PR 19). **Limitaciones heredadas**: Control de Inventario y Ajustes nunca tuvieron persistencia Supabase ni formularios reales en el monolito; los listados arrancan vacíos y "Nuevo" muestra alert "pendiente de UI dedicada con persistencia Supabase". Depósitos / Ubicaciones / Categorías muestran listado de solo lectura — crear/editar (que en el monolito tenían form inline con API parcial) muestra alert "pendiente de UI dedicada". **Adelanto del PR 19**: como parte de PR 9 también movimos el **topbar grande** (Cell Home ERP + Home/Taller/Ventas/Compras/Finanzas/Contabilidad/Deposito/Informes/Config + Casa Central + tickets + user) de `(dashboard)/page.tsx` a `(dashboard)/layout.tsx`, así se ve en TODAS las rutas (no sólo en el home). Tabs como Links: migrados (taller→`/servicio-tecnico`, deposito→`/stock`) van a su ruta top-level; los demás van a `/?module=X` y `(dashboard)/page.tsx` lee `useSearchParams()` para mostrar el módulo correcto. Eliminadas las **mini-topbars indigo** de "← Volver al ERP" en las 24 páginas + 2 layouts (`/stock` y `/servicio-tecnico`) — ya no hacen falta porque el topbar grande está siempre arriba.

## PRs pendientes (orden)
- **PR 10 — Compras parte 1**: `/compras/oc`, `/compras/oc/nuevo`, `/compras/oc/[id]`, `/compras/recepciones`, `/compras/recepciones/[id]`. **OJO**: el componente `ProveedorFicha` (en `/proveedores/[id]`) tiene tabs Cuenta Corriente / Historial. La cuenta corriente y el historial podrían quedar como tabs internas o como rutas hijas — decidir cuando lleguemos.
- **PR 11 — Compras parte 2**: `/compras/facturas`, `/compras/facturas/[id]`, `/compras/nc`, `/compras/nd`, `/compras/op`, `/compras/op/[id]`, `/compras/legajos`, `/compras/legajos/[id]`, `/compras/despachos-simples`, `/compras/despachos-simples/[id]`, `/compras/conciliacion-deuda`, `/compras/categorias-proveedores`.
- **PR 12 — Ventas parte 1**: `/ventas/clientes`, `/ventas/clientes/nuevo`, `/ventas/clientes/[id]`, `/ventas/conciliacion`.
- **PR 13 — Ventas parte 2**: `/ventas/nv`, `/ventas/nv/nueva`, `/ventas/nv/[id]`, `/ventas/oe`, `/ventas/oe/[id]`, `/ventas/remitos`, `/ventas/remitos/[id]`. **El más grande de Ventas** — núcleo del flujo de venta.
- **PR 14 — Ventas parte 3**: `/ventas/facturas`, `/ventas/facturas/[id]`, `/ventas/recibos`, `/ventas/recibos/[id]`. Cuidado: el form de Recibo HOY es modal — convertir a página.
- **PR 15 — Ventas parte 4**: `/ventas/nc`, `/ventas/nd`, `/ventas/ajustes`, `/ventas/ajustes/[id]`, `/ventas/categorias-cliente`, `/ventas/criterios-cotizador`, `/ventas/nc-categorias`, `/ventas/senia-equipo`, `/ventas/senia-equipo/[id]`.
- **PR 16 — Finanzas**: módulo gigante (~9.7K líneas). Probablemente requiera 2 sub-PRs (Banco/Caja+Operaciones+Cheques en uno, Tarjetas+Configuración en otro). Decidir cuando lleguemos.
- **PR 17 — Contabilidad**: 24 sub-vistas. Probablemente más lineal porque cada vista es una pantalla simple (asientos, libro mayor, plan cuentas, etc.).
- **PR 18 — Informes**: pantalla única, redirección directa.
- **PR 19 — MIGRATION_NOTES.md**: limpieza final (eliminar dead code en monolitos, deduplicar helpers compartidos, redirects desde URLs viejas si hace falta).

## Convenciones que estamos siguiendo

- Cada page es client component (`"use client"`) con un guard `useEffect(() => { if (!canSee("modulo", "subview")) router.replace("/") }, ...)`.
- Mini-topbar indigo arriba con "← Volver al ERP" + nombre de la sección. Esto es **temporal** hasta que el topbar grande se mueva al `(dashboard)/layout.tsx`.
- Cada listado: usar CSS Grid (no `<table>`) para que cada fila pueda ser un `<Link>` y Ctrl+Click funcione nativo.
- Cada ficha: el componente principal (`<Componente prop={x} />`) hace su propio fetch. Las pages son thin wrappers.
- Cada formulario: extraído a `components/<modulo>/formulario.tsx` con props `inicial`, `onGuardar`, `onCancelar`.
- En el monolito de origen (ej. `ventas-module.tsx`): el sidebar item correspondiente se cambia a `<Link>`, el `case` del renderContent switch se saca, las funciones `render*` quedan como dead code.

## Pendiente para el final (PR 19 cleanup)

- Mover el topbar grande del ERP al `(dashboard)/layout.tsx` y sacar los mini-topbars "Volver al ERP" de cada página migrada.
- Borrar las funciones `render*` huérfanas en `ventas-module.tsx`, `modulo-compras-v2.tsx`, `modulo-stock.tsx`, `modulo-finanzas.tsx`, `modulo-contabilidad.tsx`, `modulo-taller.tsx`.
- Borrar imports muertos.
- Deduplicar helpers que se duplicaron al extraer (`formatCurrency`, `formatDate`, constantes de país/provincia, etc.) → mover a `lib/format.ts` o similar.
- Borrar el monolito `app/(dashboard)/page.tsx` cuando todos los módulos estén migrados, reemplazándolo por una home dashboard limpia.
- Resolver TODOs marcados por los agentes (movimientosCtaCte en proveedores, etc.).

## Cómo retomar en una conversación nueva

Pegá esto al inicio de la nueva conversación:

> "Estamos migrando el ERP de CellHome a routing limpio con App Router de Next.js. Llevamos PRs 0–9 completos. Leé `MIGRATION_STATUS.md` y `ROUTING_AUDIT.md` para el contexto completo. Arrancá con el PR 10 — Compras parte 1."

Eso le da al chat nuevo todo el contexto de las decisiones tomadas, el orden, las convenciones, y dónde estamos parados.
