"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import {
  fetchProveedores,
  fetchOrdenesCompra,
  fetchFacturasCompra,
} from "@/lib/compras-actions"

// Helpers duplicados desde modulo-compras-v2.tsx
const formatCurrency = (amount: number, currency: string = "ARS") => {
  const num = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  const code = currency || "ARS"
  return `${code} $ ${num}`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("es-AR")
}

// Tipo MovimientoCtaCteProveedor duplicado desde modulo-compras-v2.tsx
// (en el original es local, no exportado).
interface MovimientoCtaCteProveedor {
  id: number
  proveedor_id: number
  tipo: "factura" | "nota_credito" | "nota_debito" | "pago" | "ajuste"
  numero: string
  fecha: string
  concepto: string
  debe: number
  haber: number
  saldo: number
}

type TabFicha = "contactos" | "ventas_compras" | "contabilidad" | "observaciones"

export default function ProveedorFicha({ proveedorId }: { proveedorId: number }) {
  const router = useRouter()

  const [proveedor, setProveedor] = useState<any | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabActivo, setTabActivo] = useState<TabFicha>("contactos")

  // TODO: no existe action `fetchMovimientosCtaCteProveedor` en lib/compras-actions.ts.
  // En modulo-compras-v2.tsx el state inicia como [] y nunca se popula. Mantenemos
  // el mismo comportamiento (array vacío) hasta que se exponga un endpoint.
  const [movimientosCtaCte, setMovimientosCtaCte] = useState<MovimientoCtaCteProveedor[]>([])

  // Para el panel "Resumen": facturasCompra y ordenesCompra para contar pendientes.
  // Reutilizamos los fetchers existentes.
  const [facturasCompra, setFacturasCompra] = useState<any[]>([])
  const [ordenesCompra, setOrdenesCompra] = useState<any[]>([])

  // Cargar proveedor — intentamos GET por id y caemos a fetchProveedores+filter.
  useEffect(() => {
    let cancelled = false
    setCargando(true)
    setError(null)

    const cargarPorId = async () => {
      try {
        const res = await fetch(`/api/compras/proveedores/${proveedorId}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setProveedor({ ...data, nombre: data.nombre ?? data.razon_social ?? "" })
          }
          return true
        }
      } catch (err) {
        // fallthrough al fallback
      }
      return false
    }

    ;(async () => {
      const ok = await cargarPorId()
      if (!ok) {
        try {
          const data = await fetchProveedores()
          const found = (data ?? []).find((p: any) => Number(p.id) === Number(proveedorId))
          if (cancelled) return
          if (found) {
            setProveedor({ ...found, nombre: found.nombre ?? found.razon_social ?? "" })
          } else {
            setError("Proveedor no encontrado")
          }
        } catch (err: any) {
          if (!cancelled) setError(err?.message ?? "Error al cargar proveedor")
        }
      }
      if (!cancelled) setCargando(false)
    })()

    return () => {
      cancelled = true
    }
  }, [proveedorId])

  // Cargar facturas y órdenes (para Resumen). Si falla, dejamos arrays vacíos.
  useEffect(() => {
    let cancelled = false
    fetchFacturasCompra()
      .then(data => {
        if (!cancelled) setFacturasCompra(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
    fetchOrdenesCompra()
      .then(data => {
        if (!cancelled) setOrdenesCompra(Array.isArray(data) ? data : [])
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [])

  if (cargando) {
    return <div className="px-4 py-8 text-center text-sm text-gray-400">Cargando proveedor...</div>
  }

  if (error || !proveedor) {
    return (
      <div className="px-4 py-8 text-center text-sm text-red-600">
        {error ?? "Proveedor no encontrado"}
      </div>
    )
  }

  const movimientos = movimientosCtaCte.filter(m => m.proveedor_id === proveedor.id)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <Link href="/proveedores" className="hover:text-blue-600">
          Proveedores
        </Link>
        <span>/</span>
        <span className="text-gray-900">{proveedor.codigo}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={() => router.push("/proveedores")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{proveedor.nombre}</h1>
            <p className="text-sm text-gray-500">
              {proveedor.codigo} | {proveedor.cuit}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/proveedores/${proveedor.id}/editar`}
            className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 flex items-center gap-1"
          >
            <Edit className="w-4 h-4" /> Editar
          </Link>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              proveedor.tipo === "nacional"
                ? "bg-blue-100 text-blue-700"
                : proveedor.tipo === "internacional"
                ? "bg-purple-100 text-purple-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {String(proveedor.tipo ?? "").charAt(0).toUpperCase() + String(proveedor.tipo ?? "").slice(1)}
          </span>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="flex border-b">
              {(["contactos", "ventas_compras", "contabilidad", "observaciones"] as const).map(tab => {
                const labels: Record<string, string> = {
                  contactos: "Contactos",
                  ventas_compras: "Ventas & Compras",
                  contabilidad: "Contabilidad",
                  observaciones: "Observaciones",
                }
                return (
                  <button
                    key={tab}
                    onClick={() => setTabActivo(tab)}
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      tabActivo === tab
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                )
              })}
            </div>
            <div className="p-6">
              {/* Tab: Contactos */}
              {tabActivo === "contactos" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Razón Social:</span>
                      <span className="ml-2 font-medium">{proveedor.razon_social || proveedor.nombre}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Nombre Fantasía:</span>
                      <span className="ml-2 font-medium">{proveedor.nombre_fantasia || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tipo Documento:</span>
                      <span className="ml-2 font-medium">{proveedor.tipo_documento || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">N° Documento:</span>
                      <span className="ml-2 font-medium">
                        {proveedor.numero_documento || proveedor.cuit || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Dirección:</span>
                      <span className="ml-2 font-medium">
                        {proveedor.calle_numero || proveedor.direccion || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ciudad:</span>
                      <span className="ml-2 font-medium">
                        {[proveedor.ciudad, proveedor.provincia].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">País:</span>
                      <span className="ml-2 font-medium">{proveedor.pais || "Argentina"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Código Postal:</span>
                      <span className="ml-2 font-medium">{proveedor.codigo_postal || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Teléfono:</span>
                      <span className="ml-2 font-medium">
                        {proveedor.telefono || proveedor.celular || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2 font-medium text-blue-600">{proveedor.email || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Web:</span>
                      <span className="ml-2 font-medium text-blue-600">{proveedor.web || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Posición Fiscal:</span>
                      <span className="ml-2 font-medium">{proveedor.posicion_fiscal || "—"}</span>
                    </div>
                  </div>
                  {(proveedor.contactos ?? []).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Contactos adicionales</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-gray-500 uppercase">
                            <th className="text-left py-2 px-2">Nombre</th>
                            <th className="text-left py-2 px-2">Sector</th>
                            <th className="text-left py-2 px-2">Teléfono</th>
                            <th className="text-left py-2 px-2">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(proveedor.contactos ?? []).map((c: any) => (
                            <tr key={c.id} className="border-b">
                              <td className="py-2 px-2 font-medium">{c.nombre}</td>
                              <td className="py-2 px-2 text-gray-500">{c.sector || "—"}</td>
                              <td className="py-2 px-2">{c.telefono || "—"}</td>
                              <td className="py-2 px-2 text-blue-600">{c.email || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Ventas & Compras */}
              {tabActivo === "ventas_compras" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Condición de Pago:</span>
                    <span className="ml-2 font-medium">{proveedor.condicion_pago || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Moneda Habitual:</span>
                    <span className="ml-2 font-medium">{proveedor.moneda_habitual || "ARS"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Moneda por Defecto:</span>
                    <span className="ml-2 font-medium">{proveedor.moneda_defecto || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tipo Cotización:</span>
                    <span className="ml-2 font-medium">{proveedor.tipo_cotizacion_defecto || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Categoría:</span>
                    <span className="ml-2 font-medium">{proveedor.categoria_proveedor || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <span className="ml-2 font-medium capitalize">{proveedor.tipo}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Sucursal Origen:</span>
                    <span className="ml-2 font-medium">{proveedor.sucursal_origen || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Confidencial:</span>
                    <span
                      className={`ml-2 font-medium ${
                        proveedor.confidencial ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {proveedor.confidencial ? "Sí" : "No"}
                    </span>
                  </div>
                </div>
              )}

              {/* Tab: Contabilidad */}
              {tabActivo === "contabilidad" && (
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        (proveedor as any).aplica_circuito_compras
                          ? "bg-indigo-900 border-indigo-900"
                          : "border-gray-300"
                      }`}
                    >
                      {(proveedor as any).aplica_circuito_compras && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </span>
                    <span className="font-medium">Aplica Circuito de Compras</span>
                  </div>
                  {!(proveedor as any).aplica_circuito_compras && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500">Cuenta Gastos por Defecto:</span>
                        <span className="ml-2 font-medium">
                          {proveedor.cuenta_gastos_defecto_codigo
                            ? `${proveedor.cuenta_gastos_defecto_codigo} — ${proveedor.cuenta_gastos_defecto_nombre}`
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cuenta Analítica:</span>
                        <span className="ml-2 font-medium">{proveedor.cuenta_analitica || "—"}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Observaciones */}
              {tabActivo === "observaciones" && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {proveedor.observaciones || <span className="text-gray-400">Sin observaciones</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Resumen</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Saldo Actual:</span>
                <span
                  className={`text-xl font-bold ${
                    (proveedor.saldo ?? 0) > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatCurrency(proveedor.saldo ?? 0)}
                </span>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Facturas Pendientes:</span>
                  <span className="font-medium">
                    {
                      facturasCompra.filter(
                        f => f.proveedor_id === proveedor.id && f.estado === "pendiente",
                      ).length
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">OC Pendientes:</span>
                  <span className="font-medium">
                    {
                      ordenesCompra.filter(
                        o => o.proveedor_id === proveedor.id && o.estado === "confirmada",
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Últimos Movimientos */}
          {movimientos.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Últimos Movimientos</h3>
              <div className="space-y-2">
                {movimientos.slice(0, 5).map(mov => (
                  <div key={mov.id} className="flex justify-between text-xs border-b pb-1">
                    <span className="text-gray-500">
                      {formatDate(mov.fecha)} · {mov.tipo.replace("_", " ")}
                    </span>
                    <span className="font-medium">{formatCurrency(mov.saldo)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
