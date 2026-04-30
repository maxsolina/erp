# Estado de la migración a Routing limpio (App Router)

Última actualización: 2026-04-30 — **migración completa (PRs 0–18)**

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

## Pendiente para limpieza futura (PR 19 cleanup)

No bloqueante; el ERP está completamente funcional con clean URLs. Estos son ítems de polish:

1. **Convertir redirect-stubs a extracciones reales** (con su propio listado/ficha/form):
   - Ventas: NV, OE, Remitos, Facturas, Recibos, NC, ND, Ajustes, Seña, Categorías Cliente, Criterios Cotizador, NC-Categorías
   - Compras: Legajos Importación, Despachos Simples, Conciliación de Deuda, Categorías de Proveedores
   - Finanzas: las 25 rutas (todas redirect-stubs hoy)
   - Contabilidad: las 19 rutas (todas redirect-stubs hoy)
2. **Borrar dead code** en los monolitos:
   - `components/ventas-module.tsx`: render functions de listas-precios, toma-equipo (ya migradas), case del switch quitado
   - `components/modulo-compras-v2.tsx`: render functions de OC, recepciones, etc. (parcial)
   - ~~`components/modulo-stock.tsx`~~ — borrado (PR 19, post-PR-18 cleanup)
   - ~~`components/modulo-taller.tsx`~~ — borrado (PR 19, post-PR-18 cleanup)
   - `app/(dashboard)/page.tsx`: helpers `renderSidebar`/`renderContent` + `renderDashboard`/`renderOrdenes`/`renderTecnicos`/etc. (~620 líneas, sólo del módulo Taller, nunca llamados desde JSX desde PR 7)
3. **Deduplicar helpers** (`formatCurrency`, `formatDate`) — hay copias en cada `components/<modulo>/_shared.ts`. Mover a `lib/format.ts`.
4. **Mover `app/(dashboard)/page.tsx` a un dashboard limpio** — hoy sigue siendo el "shell" del monolito completo. Idealmente queda solo como home dashboard con KPIs.
5. **Resolver TODOs marcados** (movimientosCtaCte en proveedores, modal vs página para algunos forms, etc.)

## Convenciones (siguen aplicando)

- Cada page es client component (`"use client"`) con permission guard `useEffect(() => { if (!canSee("modulo", "subview")) router.replace("/") }, ...)`
- Topbar global vive en `(dashboard)/layout.tsx`. Las pestañas son Links para módulos migrados y `/?module=X` para los que siguen en el monolito.
- Cada módulo tiene su `components/sidebars/<modulo>-config.ts` y un layout `(dashboard)/<modulo>/layout.tsx` que usa `<ModuleSidebar config={...}>`.
- Los redirect-stubs llaman a `<ModuloRedirectStub view="X" permKey="Y" />` y el monolito sincroniza `?view=` con su `activeView` interno vía `useSearchParams()`.
