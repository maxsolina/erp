"use client"

// Dashboard limpio del ERP. Reemplaza la mock-intranet de modulo-home.tsx.
// Muestra KPIs reales (counts en /api/...) + accesos rápidos a cada módulo.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Wrench,
  FileText,
  Users,
  Truck,
  Receipt,
  CreditCard,
  Banknote,
  ArrowRight,
} from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { formatCurrency } from "@/lib/format"

interface KpiData {
  nvAbiertas: number
  ocPendientes: number
  otsActivas: number
  facturasMes: number
  totalFacturadoMes: number
  cargando: boolean
}

const KPI_INICIAL: KpiData = {
  nvAbiertas: 0,
  ocPendientes: 0,
  otsActivas: 0,
  facturasMes: 0,
  totalFacturadoMes: 0,
  cargando: true,
}

function inicioDelMes(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export default function DashboardHome() {
  const { currentUser, canSee } = useERP()
  const [kpis, setKpis] = useState<KpiData>(KPI_INICIAL)

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      const inicioMes = inicioDelMes().toISOString()
      try {
        const [nvR, ocR, otR, facR] = await Promise.all([
          canSee("ventas", "notas_venta") ? fetch("/api/notas-venta").then(r => r.json()).catch(() => []) : [],
          canSee("compras", "ordenes_compra") ? fetch("/api/compras/ordenes-compra").then(r => r.json()).catch(() => []) : [],
          canSee("servicio_tecnico", "ordenes") ? fetch("/api/taller/ordenes").then(r => r.json()).catch(() => []) : [],
          canSee("ventas", "facturas") ? fetch("/api/facturas").then(r => r.json()).catch(() => []) : [],
        ])

        if (cancelado) return

        const nvs: { estado?: string }[] = Array.isArray(nvR) ? nvR : []
        const ocs: { estado?: string }[] = Array.isArray(ocR) ? ocR : []
        const ots: { estado?: string }[] = Array.isArray(otR) ? otR : []
        const facturas: { estado?: string; fecha?: string; total?: number }[] = Array.isArray(facR) ? facR : []

        const nvAbiertas = nvs.filter(n => n.estado === "abierta" || n.estado === "borrador" || n.estado === "a_facturar" || n.estado === "verificacion_factura" || n.estado === "verificacion_oe").length
        const ocPendientes = ocs.filter(o => o.estado === "borrador" || o.estado === "confirmada" || o.estado === "parcial").length
        const otsActivas = ots.filter(o => o.estado && o.estado !== "entregado" && o.estado !== "cancelada").length
        const facturasMes = facturas.filter(f => f.fecha && f.fecha >= inicioMes && f.estado !== "cancelada").length
        const totalFacturadoMes = facturas
          .filter(f => f.fecha && f.fecha >= inicioMes && f.estado !== "cancelada" && f.estado !== "borrador")
          .reduce((s, f) => s + Number(f.total ?? 0), 0)

        setKpis({ nvAbiertas, ocPendientes, otsActivas, facturasMes, totalFacturadoMes, cargando: false })
      } catch (err) {
        console.error("Error cargando KPIs", err)
        if (!cancelado) setKpis(prev => ({ ...prev, cargando: false }))
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [canSee])

  const saludo = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return "Buenos días"
    if (h < 19) return "Buenas tardes"
    return "Buenas noches"
  }, [])

  const accesos = useMemo(() => {
    const items: { href: string; icon: typeof ShoppingBag; titulo: string; descripcion: string; color: string; permModulo: string; permKey?: string }[] = [
      { href: "/ventas/nv", icon: ShoppingBag, titulo: "Notas de Venta", descripcion: "Gestionar pedidos de clientes", color: "from-emerald-500 to-emerald-600", permModulo: "ventas", permKey: "notas_venta" },
      { href: "/ventas/clientes", icon: Users, titulo: "Clientes", descripcion: "Cuentas y cuenta corriente", color: "from-blue-500 to-blue-600", permModulo: "ventas", permKey: "clientes" },
      { href: "/ventas/facturas", icon: Receipt, titulo: "Facturas", descripcion: "Comprobantes de venta", color: "from-amber-500 to-amber-600", permModulo: "ventas", permKey: "facturas" },
      { href: "/compras/oc", icon: ShoppingCart, titulo: "Órdenes de Compra", descripcion: "Compras a proveedores", color: "from-indigo-500 to-indigo-600", permModulo: "compras", permKey: "ordenes_compra" },
      { href: "/stock", icon: Package, titulo: "Stock", descripcion: "Inventario y movimientos", color: "from-teal-500 to-teal-600", permModulo: "stock" },
      { href: "/servicio-tecnico", icon: Wrench, titulo: "Servicio Técnico", descripcion: "Órdenes de trabajo y kanban", color: "from-orange-500 to-orange-600", permModulo: "servicio_tecnico" },
      { href: "/productos", icon: Package, titulo: "Productos", descripcion: "Catálogo y precios", color: "from-violet-500 to-violet-600", permModulo: "productos" },
      { href: "/finanzas/cajas", icon: Banknote, titulo: "Finanzas", descripcion: "Tesorería y movimientos", color: "from-pink-500 to-pink-600", permModulo: "finanzas" },
      { href: "/contabilidad/plan-cuentas", icon: FileText, titulo: "Contabilidad", descripcion: "Plan de cuentas y asientos", color: "from-purple-500 to-purple-600", permModulo: "contabilidad" },
      { href: "/informes", icon: FileText, titulo: "Informes", descripcion: "Reportes y métricas", color: "from-slate-500 to-slate-600", permModulo: "reportes" },
    ]
    return items.filter(it => it.permKey ? canSee(it.permModulo, it.permKey) : canSee(it.permModulo))
  }, [canSee])

  const nombreUsuario = currentUser?.nombre?.split(" ")[0] ?? "Usuario"

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-amber-900">
          {saludo}, {nombreUsuario}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={ShoppingBag}
          label="NV abiertas"
          value={kpis.cargando ? "…" : String(kpis.nvAbiertas)}
          href="/ventas/nv"
          accent="bg-emerald-50 text-emerald-700"
          visible={canSee("ventas", "notas_venta")}
        />
        <KpiCard
          icon={ShoppingCart}
          label="OC pendientes"
          value={kpis.cargando ? "…" : String(kpis.ocPendientes)}
          href="/compras/oc"
          accent="bg-indigo-50 text-indigo-700"
          visible={canSee("compras", "ordenes_compra")}
        />
        <KpiCard
          icon={Wrench}
          label="OTs activas"
          value={kpis.cargando ? "…" : String(kpis.otsActivas)}
          href="/servicio-tecnico"
          accent="bg-orange-50 text-orange-700"
          visible={canSee("servicio_tecnico", "ordenes")}
        />
        <KpiCard
          icon={Receipt}
          label={kpis.facturasMes > 0 ? `${kpis.facturasMes} facturas del mes` : "Facturado este mes"}
          value={kpis.cargando ? "…" : formatCurrency(kpis.totalFacturadoMes)}
          href="/ventas/facturas"
          accent="bg-amber-50 text-amber-700"
          valueClassName="text-base md:text-xl"
          visible={canSee("ventas", "facturas")}
        />
      </section>

      {/* Accesos rápidos */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {accesos.map(a => {
            const Icon = a.icon
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all flex items-start gap-3"
              >
                <div className={`shrink-0 p-2 rounded-lg bg-gradient-to-br ${a.color} text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors">{a.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{a.descripcion}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 transition-colors shrink-0 mt-1.5" />
              </Link>
            )
          })}
          {accesos.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">
              No tenés módulos visibles. Contactá al administrador para revisar tus permisos.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

interface KpiCardProps {
  icon: typeof ShoppingBag
  label: string
  value: string
  href: string
  accent: string
  visible: boolean
  valueClassName?: string
}

function KpiCard({ icon: Icon, label, value, href, accent, visible, valueClassName }: KpiCardProps) {
  if (!visible) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 opacity-50">
        <div className="flex items-center gap-2 text-xs text-gray-400 uppercase font-medium">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <p className="text-2xl font-bold text-gray-300 mt-2">—</p>
      </div>
    )
  }
  return (
    <Link href={href} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all block">
      <div className={`inline-flex items-center gap-2 text-xs uppercase font-medium px-2 py-1 rounded ${accent}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={`font-bold text-gray-900 mt-3 ${valueClassName ?? "text-3xl"}`}>{value}</p>
    </Link>
  )
}
