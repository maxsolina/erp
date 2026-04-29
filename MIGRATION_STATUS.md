# Estado de la migración a Routing limpio (App Router)

Última actualización: 2026-04-29 fin de sesión

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

## PRs pendientes (orden)

- 🔜 **PR 6 — Toma de Equipo**: vive parte adentro de Ventas. Decisión: queda como sub-ruta `/ventas/toma-equipo` o top-level `/toma-equipo`. **El prompt original sugiere top-level** — usar `/toma-equipo`.
- **PR 7 — Servicio Técnico (Taller)**: módulo independiente. `/servicio-tecnico/...` con OT, Kanban, catálogos (técnicos, equipos, fallas), config (áreas, categorías, tipos OT, etc.).
- **PR 8 — Stock parte 1**: `/stock` (dashboard del módulo), `/stock/transferencias`, `/stock/transferencias/[id]`, `/stock/transferencias/nueva`, `/stock/pedidos-abastecimiento`, etc. (operativo).
- **PR 9 — Stock parte 2**: `/stock/lotes-series`, `/stock/imei`, `/stock/control-inventario`, `/stock/ajustes/positivos`, `/stock/ajustes/negativos`, `/stock/cubo`, `/stock/reservado`, `/stock/config/...` (7 sub-rutas de config).
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

> "Estamos migrando el ERP de CellHome a routing limpio con App Router de Next.js. Llevamos PRs 0–5 completos. Leé `MIGRATION_STATUS.md` y `ROUTING_AUDIT.md` para el contexto completo. Arrancá con el PR 6 — Toma de Equipo."

Eso le da al chat nuevo todo el contexto de las decisiones tomadas, el orden, las convenciones, y dónde estamos parados.
