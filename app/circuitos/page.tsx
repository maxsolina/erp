"use client"

import { useState } from "react"
import { Download, Check, X, Edit, Plus, Trash2 } from "lucide-react"

interface Circuito {
  id: number
  modulo_origen: string
  documento_origen: string
  accion: string
  modulo_destino: string
  documento_destino: string
  efecto: string
  automatico: string
  reversible: string
  validaciones: string
  notas: string
  confirmado: string
}

const circuitosIniciales: Circuito[] = [
  { id: 1, modulo_origen: "Ventas", documento_origen: "Nota de Venta", accion: "Confirmar", modulo_destino: "Stock", documento_destino: "Reserva", efecto: "Reserva stock de los productos de la NV", automatico: "SI", reversible: "SI - al cancelar NV", validaciones: "Stock disponible >= cantidad", notas: "", confirmado: "" },
  { id: 2, modulo_origen: "Ventas", documento_origen: "Nota de Venta", accion: "Cancelar", modulo_destino: "Stock", documento_destino: "Reserva", efecto: "Libera la reserva de stock", automatico: "SI", reversible: "NO", validaciones: "NV no debe tener OE confirmada", notas: "", confirmado: "" },
  { id: 3, modulo_origen: "Ventas", documento_origen: "Orden de Entrega", accion: "Confirmar Remito", modulo_destino: "Stock", documento_destino: "Movimiento Stock", efecto: "Descuenta stock fisico del deposito", automatico: "SI", reversible: "NO - requiere NC", validaciones: "Stock fisico >= cantidad", notas: "El remito es el que descuenta, no la OE", confirmado: "" },
  { id: 4, modulo_origen: "Ventas", documento_origen: "Factura", accion: "Publicar", modulo_destino: "Cta Cte Cliente", documento_destino: "Movimiento DEBE", efecto: "Aumenta deuda del cliente", automatico: "SI", reversible: "SI - al cancelar factura", validaciones: "Cliente activo", notas: "Solo al publicar, no en borrador", confirmado: "" },
  { id: 5, modulo_origen: "Ventas", documento_origen: "Factura", accion: "Cancelar", modulo_destino: "Cta Cte Cliente", documento_destino: "Movimiento HABER", efecto: "Revierte el movimiento de deuda", automatico: "SI", reversible: "NO", validaciones: "Factura no debe tener pagos aplicados", notas: "", confirmado: "" },
  { id: 6, modulo_origen: "Ventas", documento_origen: "Nota de Credito Venta", accion: "Publicar", modulo_destino: "Cta Cte Cliente", documento_destino: "Movimiento HABER", efecto: "Disminuye deuda del cliente (saldo a favor)", automatico: "SI", reversible: "NO", validaciones: "Factura origen valida", notas: "", confirmado: "" },
  { id: 7, modulo_origen: "Ventas", documento_origen: "Nota de Debito Venta", accion: "Publicar", modulo_destino: "Cta Cte Cliente", documento_destino: "Movimiento DEBE", efecto: "Aumenta deuda del cliente", automatico: "SI", reversible: "NO", validaciones: "", notas: "Por intereses, diferencias, etc", confirmado: "" },
  { id: 8, modulo_origen: "Ventas", documento_origen: "Recibo", accion: "Publicar", modulo_destino: "Cta Cte Cliente", documento_destino: "Movimiento HABER", efecto: "Disminuye deuda del cliente", automatico: "SI", reversible: "SI - al cancelar recibo", validaciones: "Formas de pago validas", notas: "", confirmado: "" },
  { id: 9, modulo_origen: "Ventas", documento_origen: "Recibo", accion: "Cancelar", modulo_destino: "Cta Cte Cliente", documento_destino: "Movimiento DEBE", efecto: "Revierte el pago, aumenta deuda nuevamente", automatico: "SI", reversible: "NO", validaciones: "Motivo de cancelacion requerido", notas: "", confirmado: "" },
  { id: 10, modulo_origen: "Ventas", documento_origen: "Toma de Equipo", accion: "Confirmar", modulo_destino: "Compras", documento_destino: "Recepcion", efecto: "Genera recepcion de compra del equipo usado", automatico: "SI", reversible: "NO", validaciones: "Evaluacion completa", notas: "Recepcion queda en borrador para revision", confirmado: "" },
  { id: 11, modulo_origen: "Ventas", documento_origen: "Toma de Equipo", accion: "Confirmar", modulo_destino: "Cta Cte Cliente", documento_destino: "Nota de Credito", efecto: "Genera NC por el valor acordado del equipo", automatico: "SI", reversible: "NO", validaciones: "Precio dentro del rango permitido", notas: "El cliente tiene saldo a favor", confirmado: "" },
  { id: 12, modulo_origen: "Ventas", documento_origen: "Toma de Equipo", accion: "Confirmar", modulo_destino: "Stock", documento_destino: "Ingreso Stock", efecto: "Ingresa equipo usado al inventario", automatico: "SI", reversible: "NO", validaciones: "", notas: "Como producto usado/reacondicionado", confirmado: "" },
  { id: 13, modulo_origen: "Compras", documento_origen: "Orden de Compra", accion: "Confirmar", modulo_destino: "-", documento_destino: "-", efecto: "Queda pendiente de recepcion", automatico: "-", reversible: "SI - mientras no haya recepciones", validaciones: "Proveedor activo", notas: "", confirmado: "" },
  { id: 14, modulo_origen: "Compras", documento_origen: "Orden de Compra", accion: "Cancelar", modulo_destino: "-", documento_destino: "-", efecto: "Anula la OC", automatico: "-", reversible: "NO", validaciones: "No debe tener recepciones", notas: "", confirmado: "" },
  { id: 15, modulo_origen: "Compras", documento_origen: "Recepcion", accion: "Confirmar", modulo_destino: "Stock", documento_destino: "Ingreso Stock", efecto: "Ingresa mercaderia al deposito (a costo FOB)", automatico: "SI", reversible: "NO - requiere devolucion", validaciones: "OC confirmada", notas: "Costo se actualiza luego con legajo", confirmado: "" },
  { id: 16, modulo_origen: "Compras", documento_origen: "Recepcion", accion: "Confirmar", modulo_destino: "Legajo/Despacho", documento_destino: "Vinculacion", efecto: "Asocia productos al legajo de importacion", automatico: "MANUAL", reversible: "SI", validaciones: "", notas: "Usuario selecciona legajo destino", confirmado: "" },
  { id: 17, modulo_origen: "Compras", documento_origen: "Factura Compra", accion: "Registrar", modulo_destino: "Cta Cte Proveedor", documento_destino: "Movimiento DEBE", efecto: "Aumenta deuda con el proveedor", automatico: "SI", reversible: "SI - al anular", validaciones: "Recepcion vinculada", notas: "", confirmado: "" },
  { id: 18, modulo_origen: "Compras", documento_origen: "NC Compra", accion: "Registrar", modulo_destino: "Cta Cte Proveedor", documento_destino: "Movimiento HABER", efecto: "Disminuye deuda con proveedor", automatico: "SI", reversible: "NO", validaciones: "Factura origen valida", notas: "Por devolucion o diferencia precio", confirmado: "" },
  { id: 19, modulo_origen: "Compras", documento_origen: "ND Compra", accion: "Registrar", modulo_destino: "Cta Cte Proveedor", documento_destino: "Movimiento DEBE", efecto: "Aumenta deuda con proveedor", automatico: "SI", reversible: "NO", validaciones: "", notas: "Por intereses, ajustes, etc", confirmado: "" },
  { id: 20, modulo_origen: "Compras", documento_origen: "Orden de Pago", accion: "Confirmar", modulo_destino: "Cta Cte Proveedor", documento_destino: "Movimiento HABER", efecto: "Disminuye deuda con proveedor", automatico: "SI", reversible: "NO", validaciones: "Facturas seleccionadas", notas: "", confirmado: "" },
  { id: 21, modulo_origen: "Compras", documento_origen: "Orden de Pago", accion: "Confirmar", modulo_destino: "Tesoreria", documento_destino: "Movimiento Caja/Banco", efecto: "Registra salida de fondos", automatico: "SI", reversible: "NO", validaciones: "Saldo disponible en caja/banco", notas: "", confirmado: "" },
  { id: 22, modulo_origen: "Compras", documento_origen: "Legajo Importacion", accion: "Distribuir Costos", modulo_destino: "Stock", documento_destino: "Actualizacion Costo", efecto: "Actualiza ultimo costo de productos con landing cost", automatico: "MANUAL", reversible: "SI - recalcular", validaciones: "Todas las facturas de gastos cargadas", notas: "Criterios: peso, valor, unidades", confirmado: "" },
  { id: 23, modulo_origen: "Compras", documento_origen: "Legajo Importacion", accion: "Cerrar", modulo_destino: "Stock", documento_destino: "Costo Final", efecto: "Congela el costo de los productos del legajo", automatico: "MANUAL", reversible: "NO", validaciones: "Distribucion completa", notas: "", confirmado: "" },
  { id: 24, modulo_origen: "Compras", documento_origen: "Despacho Simple", accion: "Distribuir Flete", modulo_destino: "Stock", documento_destino: "Actualizacion Costo", efecto: "Distribuye flete por peso y actualiza costo", automatico: "MANUAL", reversible: "SI - recalcular", validaciones: "Peso de productos cargado", notas: "Para importaciones USA sin legajo completo", confirmado: "" },
  { id: 25, modulo_origen: "Compras", documento_origen: "Despacho Simple", accion: "Cerrar", modulo_destino: "Stock", documento_destino: "Costo Final", efecto: "Congela el costo de los productos", automatico: "MANUAL", reversible: "NO", validaciones: "Flete distribuido", notas: "", confirmado: "" },
  { id: 26, modulo_origen: "Stock", documento_origen: "Ajuste de Inventario", accion: "Confirmar", modulo_destino: "Stock", documento_destino: "Movimiento Stock", efecto: "Ajusta cantidad en deposito (positivo o negativo)", automatico: "SI", reversible: "NO - requiere contraajuste", validaciones: "Motivo requerido", notas: "", confirmado: "" },
  { id: 27, modulo_origen: "Stock", documento_origen: "Transferencia", accion: "Confirmar", modulo_destino: "Stock", documento_destino: "Movimiento Stock", efecto: "Mueve stock entre depositos", automatico: "SI", reversible: "NO - requiere transferencia inversa", validaciones: "Stock origen >= cantidad", notas: "", confirmado: "" },
  { id: 28, modulo_origen: "Stock", documento_origen: "Devolucion Cliente", accion: "Confirmar", modulo_destino: "Stock", documento_destino: "Ingreso Stock", efecto: "Reingresa productos al deposito", automatico: "SI", reversible: "NO", validaciones: "Remito/Factura origen", notas: "", confirmado: "" },
  { id: 29, modulo_origen: "Stock", documento_origen: "Devolucion Cliente", accion: "Confirmar", modulo_destino: "Ventas", documento_destino: "NC Venta", efecto: "Genera nota de credito por devolucion", automatico: "SI", reversible: "NO", validaciones: "", notas: "", confirmado: "" },
  { id: 30, modulo_origen: "Stock", documento_origen: "Devolucion Proveedor", accion: "Confirmar", modulo_destino: "Stock", documento_destino: "Egreso Stock", efecto: "Saca productos del deposito", automatico: "SI", reversible: "NO", validaciones: "Recepcion origen", notas: "", confirmado: "" },
  { id: 31, modulo_origen: "Stock", documento_origen: "Devolucion Proveedor", accion: "Confirmar", modulo_destino: "Compras", documento_destino: "NC Compra", efecto: "Espera NC del proveedor", automatico: "MANUAL", reversible: "NO", validaciones: "", notas: "NC se registra cuando llega del proveedor", confirmado: "" },
  { id: 32, modulo_origen: "Tesoreria", documento_origen: "Movimiento Caja", accion: "Registrar", modulo_destino: "Tesoreria", documento_destino: "Saldo Caja", efecto: "Actualiza saldo de caja", automatico: "SI", reversible: "NO - requiere contraasiento", validaciones: "", notas: "", confirmado: "" },
  { id: 33, modulo_origen: "Tesoreria", documento_origen: "Transferencia Bancaria", accion: "Confirmar", modulo_destino: "Tesoreria", documento_destino: "Saldo Banco", efecto: "Actualiza saldos de cuentas bancarias", automatico: "SI", reversible: "NO", validaciones: "Saldo origen suficiente", notas: "", confirmado: "" },
]

export default function CircuitosPage() {
  const [circuitos, setCircuitos] = useState<Circuito[]>(circuitosIniciales)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleConfirmar = (id: number, valor: string) => {
    setCircuitos(prev => prev.map(c => c.id === id ? { ...c, confirmado: valor } : c))
  }

  const handleNotasChange = (id: number, notas: string) => {
    setCircuitos(prev => prev.map(c => c.id === id ? { ...c, notas: notas } : c))
  }

  const handleDelete = (id: number) => {
    setCircuitos(prev => prev.filter(c => c.id !== id))
  }

  const handleAddRow = () => {
    const newId = Math.max(...circuitos.map(c => c.id)) + 1
    setCircuitos(prev => [...prev, {
      id: newId,
      modulo_origen: "",
      documento_origen: "",
      accion: "",
      modulo_destino: "",
      documento_destino: "",
      efecto: "",
      automatico: "",
      reversible: "",
      validaciones: "",
      notas: "",
      confirmado: ""
    }])
    setEditingId(newId)
  }

  const handleFieldChange = (id: number, field: keyof Circuito, value: string) => {
    setCircuitos(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const exportToExcel = () => {
    const headers = [
      "ID", "MODULO_ORIGEN", "DOCUMENTO_ORIGEN", "ACCION", "MODULO_DESTINO", 
      "DOCUMENTO_DESTINO", "EFECTO", "AUTOMATICO", "REVERSIBLE", "VALIDACIONES", "NOTAS", "CONFIRMADO"
    ]
    
    const rows = circuitos.map(c => [
      c.id, c.modulo_origen, c.documento_origen, c.accion, c.modulo_destino,
      c.documento_destino, c.efecto, c.automatico, c.reversible, c.validaciones, c.notas, c.confirmado
    ])
    
    // Crear contenido CSV con BOM para Excel
    const BOM = '\uFEFF'
    const csvContent = BOM + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'circuitos_erp.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getConfirmadoColor = (valor: string) => {
    switch (valor) {
      case "SI": return "bg-green-100 text-green-700 border-green-300"
      case "NO": return "bg-red-100 text-red-700 border-red-300"
      case "MODIFICAR": return "bg-amber-100 text-amber-700 border-amber-300"
      default: return "bg-gray-100 text-gray-500 border-gray-300"
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mapa de Circuitos del ERP</h1>
              <p className="text-gray-500 mt-1">
                Revisá cada circuito y marcá en la columna "CONFIRMADO" si está correcto (SI), hay que eliminarlo (NO), o necesita modificaciones (MODIFICAR)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddRow}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" /> Agregar Circuito
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" /> Descargar Excel
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t">
            <div className="text-sm">
              <span className="text-gray-500">Total:</span>
              <span className="ml-2 font-semibold">{circuitos.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Confirmados:</span>
              <span className="ml-2 font-semibold text-green-600">{circuitos.filter(c => c.confirmado === "SI").length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Rechazados:</span>
              <span className="ml-2 font-semibold text-red-600">{circuitos.filter(c => c.confirmado === "NO").length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">A modificar:</span>
              <span className="ml-2 font-semibold text-amber-600">{circuitos.filter(c => c.confirmado === "MODIFICAR").length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Pendientes:</span>
              <span className="ml-2 font-semibold text-gray-600">{circuitos.filter(c => !c.confirmado).length}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="py-3 px-3 text-left font-medium">ID</th>
                  <th className="py-3 px-3 text-left font-medium">Módulo Origen</th>
                  <th className="py-3 px-3 text-left font-medium">Documento</th>
                  <th className="py-3 px-3 text-left font-medium">Acción</th>
                  <th className="py-3 px-3 text-left font-medium">Módulo Destino</th>
                  <th className="py-3 px-3 text-left font-medium">Doc. Destino</th>
                  <th className="py-3 px-3 text-left font-medium min-w-[250px]">Efecto</th>
                  <th className="py-3 px-3 text-center font-medium">Auto</th>
                  <th className="py-3 px-3 text-left font-medium">Reversible</th>
                  <th className="py-3 px-3 text-left font-medium min-w-[200px]">Notas</th>
                  <th className="py-3 px-3 text-center font-medium">Confirmado</th>
                  <th className="py-3 px-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {circuitos.map((circuito, idx) => (
                  <tr key={circuito.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="py-2 px-3 font-medium text-gray-500">{circuito.id}</td>
                    <td className="py-2 px-3">
                      {editingId === circuito.id ? (
                        <input 
                          type="text" 
                          value={circuito.modulo_origen} 
                          onChange={(e) => handleFieldChange(circuito.id, 'modulo_origen', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          circuito.modulo_origen === 'Ventas' ? 'bg-blue-100 text-blue-700' :
                          circuito.modulo_origen === 'Compras' ? 'bg-purple-100 text-purple-700' :
                          circuito.modulo_origen === 'Stock' ? 'bg-orange-100 text-orange-700' :
                          circuito.modulo_origen === 'Tesoreria' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{circuito.modulo_origen}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingId === circuito.id ? (
                        <input 
                          type="text" 
                          value={circuito.documento_origen} 
                          onChange={(e) => handleFieldChange(circuito.id, 'documento_origen', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        <span className="font-medium">{circuito.documento_origen}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingId === circuito.id ? (
                        <input 
                          type="text" 
                          value={circuito.accion} 
                          onChange={(e) => handleFieldChange(circuito.id, 'accion', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        <span className="text-emerald-700 font-medium">{circuito.accion}</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingId === circuito.id ? (
                        <input 
                          type="text" 
                          value={circuito.modulo_destino} 
                          onChange={(e) => handleFieldChange(circuito.id, 'modulo_destino', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        circuito.modulo_destino
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {editingId === circuito.id ? (
                        <input 
                          type="text" 
                          value={circuito.documento_destino} 
                          onChange={(e) => handleFieldChange(circuito.id, 'documento_destino', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        circuito.documento_destino
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {editingId === circuito.id ? (
                        <input 
                          type="text" 
                          value={circuito.efecto} 
                          onChange={(e) => handleFieldChange(circuito.id, 'efecto', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        circuito.efecto
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {editingId === circuito.id ? (
                        <select 
                          value={circuito.automatico} 
                          onChange={(e) => handleFieldChange(circuito.id, 'automatico', e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                          <option value="MANUAL">MANUAL</option>
                          <option value="-">-</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          circuito.automatico === 'SI' ? 'bg-green-100 text-green-700' :
                          circuito.automatico === 'MANUAL' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{circuito.automatico}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-600">
                      {editingId === circuito.id ? (
                        <input 
                          type="text" 
                          value={circuito.reversible} 
                          onChange={(e) => handleFieldChange(circuito.id, 'reversible', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        circuito.reversible
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={circuito.notas}
                        onChange={(e) => handleNotasChange(circuito.id, e.target.value)}
                        placeholder="Agregar notas..."
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <select
                        value={circuito.confirmado}
                        onChange={(e) => handleConfirmar(circuito.id, e.target.value)}
                        className={`px-3 py-1 border rounded font-medium text-sm ${getConfirmadoColor(circuito.confirmado)}`}
                      >
                        <option value="">Pendiente</option>
                        <option value="SI">SI</option>
                        <option value="NO">NO</option>
                        <option value="MODIFICAR">MODIFICAR</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingId(editingId === circuito.id ? null : circuito.id)}
                          className={`p-1 rounded hover:bg-gray-200 ${editingId === circuito.id ? 'text-emerald-600' : 'text-gray-400'}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(circuito.id)}
                          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Leyenda</h3>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-medium">SI</span>
              <span className="text-gray-600">Circuito confirmado, implementar tal cual</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-medium">NO</span>
              <span className="text-gray-600">Circuito a eliminar, no implementar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">MODIFICAR</span>
              <span className="text-gray-600">Requiere cambios (detallar en Notas)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
