# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # Start dev server with Turbopack on port 3000
npm run build   # Production build
npm run lint    # Run ESLint
npm start       # Start production server
```

No automated test suite is configured. TypeScript build errors are intentionally ignored in `next.config.mjs`.

## Architecture

Full-stack Next.js (App Router) ERP system called **CellHome ERP**. React 19 + TypeScript frontend, Supabase (PostgreSQL) backend, Tailwind CSS 4 + shadcn/ui components.

### Main modules

- **Ventas**: notas de venta, remitos, facturas, recibos, notas de crédito/débito
- **Compras**: órdenes de compra, recepciones, facturas de compra, órdenes de pago
- **Stock**: inventario, movimientos, transferencias, ajustes por depósito
- **Contabilidad**: plan de cuentas, asientos automáticos, períodos fiscales
- **Finanzas**: tesorería, cajas/bancos, conciliaciones
- **Taller**: órdenes de trabajo, equipos, técnicos

### Entry points

- `app/page.tsx` — monolithic main app shell that routes between modules via state
- `components/modulo-*.tsx` — one large component per module (100 KB–800 KB each)
- `contexts/erp-context.tsx` — global state, session, TypeScript entity interfaces
- `middleware.ts` — enforces auth on all `/api/*` (except `/api/auth/*`), rate-limits POST/PUT/DELETE on `/api/compras` and `/api/recibos` to 20 req/min per IP

### Supabase clients

| File | When to use |
|------|-------------|
| `lib/supabase/server.ts` → `createClient()` | Server-side (API routes, Server Components) — respects RLS |
| `lib/supabase/client.ts` | Browser components |
| `createAdminClient()` | Only when RLS bypass is explicitly required; add a comment justifying it |

### API routes

RESTful, grouped by module under `app/api/`. Standard pattern:

```typescript
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tabla").select(...)
  if (error) return dbError(error)         // from lib/api-utils.ts
  return NextResponse.json(data)
}
```

Use `dbError(err)` for Supabase errors, `apiError(msg, status)` for business-logic errors. Both return `{ error: "message" }` JSON.

### Data actions

`lib/*-actions.ts` files are thin wrappers that call API routes (using `fetch`). Client components import these instead of calling Supabase directly.

### Accounting (asientos)

`lib/contabilidad-asiento-factory.ts` generates double-entry GL records automatically for every business document. Rules:

- Account numbers are **never hardcoded** — always looked up from `contabilidad_mapeo_cuentas`
- Every business document must produce an asiento atomically in the same operation
- Posted entries are immutable; corrections use reversal/adjustment entries
- Validate `debe === haber` before posting
- Never write to a closed fiscal period

### Multi-currency

Base: ARS. Secondary: USD. Exchange rates in `contabilidad_cotizaciones`. Customer/supplier accounts track both currencies for payment reconciliation.

### Database migrations

SQL scripts live in `scripts/` (100+ files, numbered `NNN_description.sql`). When changing the schema:

1. Add a new numbered `.sql` file in `scripts/`
2. Update RLS policies if needed
3. Update TypeScript interfaces in `contexts/erp-context.tsx`

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Public anon key (browser-safe)
SUPABASE_SERVICE_ROLE_KEY       # Service role key (server-only)
```

## UI conventions (mandatory)

These come from `.github/copilot-instructions.md` and must be followed consistently.

**Colors:**
- Titles/accents: `text-amber-900`
- Primary action buttons: `bg-indigo-900 hover:bg-indigo-800 text-white`
- Secondary/cancel buttons: `border border-gray-300 text-gray-700 hover:bg-gray-50`
- Table header: `border-b bg-gray-50` with `text-xs font-semibold text-gray-600 uppercase`
- Table rows: `border-b border-gray-100 hover:bg-gray-50`

**List screens:** always include `<OdooFilterBar>` with search, filters, grouping, favorites, and a result counter (filtered/total). Reuse module wrappers (`VentasListSection`, `ComprasListSection`, `StockListSection`, `FinanzasListSection`).

**Form/edit screens:** header with back button + title on the left, Cancel + Save buttons on the top-right — never at the bottom:

```tsx
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-4">
    <BotonVolver /> <h1 className="text-2xl font-bold text-amber-900">Título</h1>
  </div>
  <div className="flex items-center gap-3">
    <button className="border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
    <button className="bg-indigo-900 hover:bg-indigo-800 text-white">Guardar</button>
  </div>
</div>
```

**No mock data.** All data must come from Supabase. Empty state = real empty result from DB. Seed data belongs in versioned SQL scripts only.

## Business circuits

`app/circuitos/` documents the document-transition flows (e.g., confirming a sale order → reserves stock + generates GL entry). When adding a new document type, register its circuit there.

## Split entities — sync rule

Some entities have their **listado + ficha read-only extracted** (`components/<modulo>/<entidad>-listado.tsx` and `<entidad>-ficha.tsx`) but their **creation/edit form still lives in the monolith** (`ventas-module.tsx`, `modulo-compras-v2.tsx`, `modulo-finanzas.tsx`, `modulo-contabilidad.tsx`).

Currently split (read at: extracted, write at: monolith):

- **Ventas:** NV, OE, Remitos, Facturas, Recibos, Ajustes, NC, ND, Seña, Categorías Cliente, NC-Categorías, Criterios Cotizador
- **Compras:** Categorías de Proveedores
- **Finanzas:** Cajas
- **Contabilidad:** Plan de Cuentas, Asientos Manuales, Asientos Automáticos, Años Fiscales, Períodos, Diarios, Monedas, Tipos de Cotización, Tipos de Cuenta

**Rule:** when adding/renaming a field on a split entity, update **both** places:

1. The ficha + type at `components/<modulo>/<entidad>-ficha.tsx` and `components/<modulo>/_shared.ts`.
2. The form inside the relevant monolith file (search for the entity name to locate its `renderXxx()` and POST handler).

If only one is updated, the field will appear correct in one path and stale/missing in the other. The user is non-technical and **will not catch this in code review** — verify with `grep` before considering the change done.

When a form gets migrated to its own route (e.g., `/ventas/nv/nueva` and `/ventas/nv/[id]/editar`), remove that entity from the list above.
