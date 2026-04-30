"use client"

// Dashboard del módulo Stock — KPIs operativos + accesos rápidos.
// Componente nuevo (el monolito no tenía dashboard, defaultaba a "transferencias").

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeftRight, Package, Truck } from "lucide-react"
import { loadPedidos, loadTransferencias, type PedidoAbastecimiento, type TransferenciaInterna } from "./_shared"

export default function StockDashboard() {
  const [transferencias, setTransferencias] = useState<TransferenciaInterna[]>([])
  const [pedidos, setPedidos] = useState<PedidoAbastecimiento[]>([])
  const [productosCount, setProductosCount] = useState<number | null>(null)

  useEffect(() => {
    setTransferencias(loadTransferencias())
    setPedidos(loadPedidos())
    fetch("/api/productos")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProductosCount(data.length)
      })
      .catch(() => {})
  }, [])

  const transferenciasBorrador = transferencias.filter(t => t.estado === "borrador").length
  const transferenciasConfirmadas = transferencias.filter(t => t.estado === "confirmada").length
  const pedidosPendientes = pedidos.filter(p => p.estado === "borrador" || p.estado === "en_ejecucion").length

  return (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-6">Dashboard de Stock</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Productos</p>
              <p className="text-2xl font-bold text-gray-900">{productosCount ?? "—"}</p>
            </div>
            <Package className="w-8 h-8 text-emerald-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Transferencias en Borrador</p>
              <p className="text-2xl font-bold text-gray-900">{transferenciasBorrador}</p>
            </div>
            <ArrowLeftRight className="w-8 h-8 text-amber-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Transferencias Confirmadas</p>
              <p className="text-2xl font-bold text-gray-900">{transferenciasConfirmadas}</p>
            </div>
            <ArrowLeftRight className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Pedidos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pedidosPendientes}</p>
            </div>
            <Truck className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Accesos rápidos</h3>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/stock/transferencias"
            className="flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-amber-50 hover:border-amber-300 transition-colors"
          >
            <ArrowLeftRight className="w-5 h-5 text-amber-700" />
            <div>
              <p className="text-sm font-medium text-gray-900">Transferencias Internas</p>
              <p className="text-xs text-gray-500">Mover stock entre depósitos / ubicaciones</p>
            </div>
          </Link>
          <Link
            href="/stock/pedidos-abastecimiento"
            className="flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <Truck className="w-5 h-5 text-blue-700" />
            <div>
              <p className="text-sm font-medium text-gray-900">Pedidos de Abastecimiento</p>
              <p className="text-xs text-gray-500">Solicitar reabastecimiento</p>
            </div>
          </Link>
          <Link
            href="/productos"
            className="flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
          >
            <Package className="w-5 h-5 text-emerald-700" />
            <div>
              <p className="text-sm font-medium text-gray-900">Productos</p>
              <p className="text-xs text-gray-500">Catálogo de productos</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
