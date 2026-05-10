# Migración App Router — Inventario pendiente

Estado al cierre de la sesión 2026-05-10 (PR `claude/senia-equipo-fixes`).

## Objetivo

Sacar todas las vistas del monolito `components/modulo-finanzas.tsx` (y demás monolitos) hacia componentes propios en `components/<modulo>/<vista>.tsx`. Las pages.tsx deben renderizar el componente nuevo en lugar de `<FinanzasRedirectStub embedded forcedView="X" />`.

Razones: bundle size, mantenibilidad, evitar el choque de sidebars en mobile.

## Convención de migración

1. Leer la función en el monolito (ej: `function RegistrosCaja()`).
2. Crear `components/<modulo>/<vista>.tsx` con:
   - `"use client"`
   - Imports: react, supabase, lucide, helpers de `_shared.tsx`
   - Componente self-contained (carga sus propios datos, maneja su propio estado)
   - Tipos: si son chicos, inline. Si son compartidos, mover a `_shared.tsx`
   - Modal helpers (si los hay) como functions en el mismo archivo
3. Actualizar `app/(dashboard)/<modulo>/<vista>/page.tsx`:
   ```tsx
   "use client"
   import { useEffect } from "react"
   import { useRouter } from "next/navigation"
   import { useERP } from "@/contexts/erp-context"
   import Vista from "@/components/<modulo>/<vista>"

   export default function Page() {
     const router = useRouter()
     const { canSee } = useERP()
     useEffect(() => { if (!canSee("<modulo>", "<permKey>")) router.replace("/") }, [canSee, router])
     return <Vista />
   }
   ```
4. `npm run build` — debe pasar limpio.
5. Sync a parent: `cp <archivo> ../erp/<archivo>` (la raíz del repo es `C:/Users/PC/Dropbox/Mi PC (DESKTOP-JND5JB5)/Desktop/erp/erp`).
6. Commit + push.
7. **NO eliminar** la función original del monolito todavía — queda como código muerto hasta que se valide. La eliminación batch se hace al final.

## Hecho en esta sesión (9 vistas + helpers)

- ✅ `components/finanzas/_shared.tsx` — Badge, SectionHeader, formatPct, formatCurrency, CUOTAS_OPTIONS, DIAS_LABELS, types (Tarjeta, GrupoTarjeta, CargosGrupo, RecargoTarjeta, Banco)
- ✅ `components/finanzas/conceptos.tsx`
- ✅ `components/finanzas/tipos-prestamos.tsx`
- ✅ `components/finanzas/cheques-terceros.tsx`
- ✅ `components/finanzas/cheques-propios.tsx`
- ✅ `components/finanzas/tarjetas.tsx`
- ✅ `components/finanzas/grupos.tsx`
- ✅ `components/finanzas/recargos.tsx`
- ✅ `components/finanzas/simulador.tsx`
- ✅ `components/finanzas/cupones.tsx`

## Pendientes — Finanzas (16 vistas)

### Tanda A — Tarjetas (1)
- [ ] **Conciliación de Tarjetas** (`ConciliacionTarjetas`, monolito ~8726, ~400 líneas)
  - 5 tabs: filtros, cupones, rechazados, cargos, observaciones
  - Tipos: `ConciliacionTarjeta`, `ConciliacionTarjetaCargo`, `CuponTarjeta` (en _shared)
  - permKey: `conciliacion_tarjetas`

### Tanda B — Bancos config (1, con 3 sub-listas)
- [ ] **BancosConfig** (`BancosConfig`, monolito ~9585) — wrapper con 3 sub-vistas
  - Sub: `ListaBancos` (~9060), `ListaCuentasBancarias` (~9185), `ListaTiposMovimiento` (~9456)
  - Cada sub-lista tiene su modal de edición
  - Mover el wrapper como `components/finanzas/bancos-config.tsx` con 3 sub-componentes
  - permKey: `bancos_config`

### Tanda C — Operaciones Financieras simples (3-4)
- [ ] **TransferenciasCaja** (`TransferenciasCaja`, monolito ~5641)
- [ ] **Depositos** (`Depositos`, ~6224) — afecta `movimientos_banco`
- [ ] **Extracciones** (`Extracciones`, ~6519) — afecta `movimientos_banco`
- [ ] **TransferenciasBancarias** (`TransferenciasBancarias`, ~6815) — afecta `movimientos_banco`
- [ ] **ConversionMonedas** (`ConversionMonedas`, ~7111)

### Tanda D — Operaciones Financieras complejas (2)
- [ ] **Prestamos** (`Prestamos`, ~7493) — usa `tipos_prestamo`, genera asiento contable
- [ ] **NegociacionCheques** (`NegociacionChequesComp`, ~7887) — cambia estado de cheques, afecta `movimientos_banco`

### Tanda E — Registros + Ajustes (4, las más críticas)
- [ ] **RegistrosCaja** (`RegistrosCaja`, ~3741, ~700 líneas) — confirmar/cancelar afecta extractos + movimientos + asientos
- [ ] **AjustesCaja** (`AjustesCaja`, ~4460) — similar a Registros pero solo ajustes (sin sentido contable de operación)
- [ ] **RegistrosBanco** (`RegistrosBanco`, ~4852) — análogo a Caja pero contra bancos
- [ ] **AjustesBanco** (`AjustesBanco`, ~5421)

### Tanda F — Conciliación Bancaria (1, la más grande)
- [ ] **ConciliacionBancaria** (`ConciliacionBancaria`, ~8334, ~1000+ líneas)
  - 5 tabs, filtros, ajustes inline, modal de ajuste manual
  - Tipos: `MovimientoBancoConciliacion`, `FiltrosConciliacion`
  - permKey: `conciliacion_bancaria`

## Pendientes — Cajas form (monolito ventas-module o modulo-finanzas)

- [ ] **Cajas — formulario** (alta/edición de caja, con tabs Valores, Usuarios, Bancos Permitidos)
  - El listado de Cajas ya está migrado (`components/finanzas/cajas-listado.tsx`)
  - Pero el form embedded sigue en el monolito
  - permKey: `cajas`
  - Si está en monolito-finanzas, función probable: `CajasView` o similar (no la busqué)

## Pendientes — Compras (5)

- [ ] **Conciliación de Deuda** (`app/(dashboard)/compras/conciliacion-deuda`)
- [ ] **Despachos Simples** — listado + ficha (`app/(dashboard)/compras/despachos-simples`)
- [ ] **Legajos de Importación** — listado + ficha (`app/(dashboard)/compras/legajos`)

## Pendientes — Contabilidad (1)

- [ ] **Libro Mayor** (`app/(dashboard)/contabilidad/libro-mayor`)

## Pendientes — Informes (3)

- [ ] **Balance General** (`app/(dashboard)/informes/balance-general`)
- [ ] **Balance Sumas y Saldos** (`app/(dashboard)/informes/balance-sumas-saldos`)
- [ ] **Estado de Resultados** (`app/(dashboard)/informes/estado-resultados`)

## Pendientes — Ventas (1)

- [ ] **Conciliación de Deuda Ventas** (`app/(dashboard)/ventas/conciliacion`)

---

## Orden sugerido para sesiones futuras

1. **Sesión 1**: Tanda B (BancosConfig + 3 sublistas) — relativamente acotado
2. **Sesión 2**: Tanda C (Transferencias Caja, Depósitos, Extracciones, Transferencias Bancarias, Conversión Monedas) — 5 vistas similares
3. **Sesión 3**: Tanda D (Préstamos + Negociación Cheques) — 2 con lógica de asientos
4. **Sesión 4**: Conciliación de Tarjetas (Tanda A) — dedicada por complejidad
5. **Sesión 5**: Registros + Ajustes de Caja (Tanda E parcial) — críticas, dedicada
6. **Sesión 6**: Registros + Ajustes de Banco (resto de Tanda E)
7. **Sesión 7**: Conciliación Bancaria (Tanda F) — dedicada por tamaño
8. **Sesión 8**: Cajas form (extracto del monolito) — depende de dónde esté
9. **Sesión 9**: Compras (3) + Ventas (1)
10. **Sesión 10**: Contabilidad (1) + Informes (3)
11. **Cleanup final**: Eliminar las funciones muertas del monolito, achicar `modulo-finanzas.tsx` a su mínima expresión (o borrar).

## Prompt sugerido para retomar

> "Seguir migración del monolito Finanzas — arrancar con [Tanda X]. Leé `MIGRATION_TODO.md` para el contexto."
