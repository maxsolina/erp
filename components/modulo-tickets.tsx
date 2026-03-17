"use client"

import { useState } from "react"
import { useERP, Ticket } from "@/contexts/erp-context"
import { 
  Search, Plus, Filter, Send, Paperclip, Clock, 
  AlertCircle, CheckCircle, MessageSquare, Tag, Calendar,
  ChevronDown, X, Upload
} from "lucide-react"
import BotonVolver from "./ui/boton-volver"

export default function ModuloTickets() {
  const { tickets, setTickets, crearTicket, currentUser } = useERP()
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [creandoTicket, setCreandoTicket] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos")

  // Filtrar tickets del usuario actual
  const misTickets = tickets
    .filter(t => t.usuario_id === currentUser?.id)
    .filter(t => filtroEstado === "todos" || t.estado === filtroEstado)
    .filter(t => filtroCategoria === "todos" || t.categoria === filtroCategoria)
    .filter(t => 
      searchText === "" || 
      t.asunto.toLowerCase().includes(searchText.toLowerCase()) ||
      t.numero.toLowerCase().includes(searchText.toLowerCase())
    )

  const estadosCount = {
    abierto: tickets.filter(t => t.usuario_id === currentUser?.id && t.estado === "abierto").length,
    en_progreso: tickets.filter(t => t.usuario_id === currentUser?.id && t.estado === "en_progreso").length,
    resuelto: tickets.filter(t => t.usuario_id === currentUser?.id && t.estado === "resuelto").length,
  }

  // =====================================================
  // CREAR TICKET
  // =====================================================

  const CrearTicketForm = () => {
    const [asunto, setAsunto] = useState("")
    const [descripcion, setDescripcion] = useState("")
    const [categoria, setCategoria] = useState<"soporte" | "error" | "mejora" | "consulta">("soporte")
    const [prioridad, setPrioridad] = useState<"baja" | "media" | "alta" | "urgente">("media")
    const [archivos, setArchivos] = useState<File[]>([])

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (!currentUser) return

      crearTicket({
        usuario_id: currentUser.id,
        usuario_nombre: currentUser.nombre,
        sucursal: currentUser.sucursal_nombre,
        categoria,
        prioridad,
        asunto,
        descripcion,
        archivos: archivos.map(f => f.name)
      })

      setCreandoTicket(false)
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setCreandoTicket(false)} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Nuevo Ticket de Soporte</h1>
            <p className="text-sm text-gray-500">Complete el formulario para crear un nuevo ticket</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          {/* Categoría y Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as typeof categoria)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="soporte">Soporte Técnico</option>
                <option value="error">Reporte de Error</option>
                <option value="mejora">Solicitud de Mejora</option>
                <option value="consulta">Consulta General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as typeof prioridad)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Asunto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Describa brevemente el problema"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción detallada</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Proporcione todos los detalles posibles: pasos para reproducir, mensajes de error, etc."
              rows={6}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
              required
            />
          </div>

          {/* Archivos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Archivos adjuntos</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={(e) => setArchivos(Array.from(e.target.files || []))}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  <span className="text-emerald-600 font-medium">Click para subir</span> o arrastrá archivos aquí
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF hasta 10MB</p>
              </label>
            </div>
            {archivos.length > 0 && (
              <div className="mt-3 space-y-2">
                {archivos.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setArchivos(archivos.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>Los tickets urgentes son atendidos en menos de 2 horas</li>
              <li>Recibirás notificaciones por email de las actualizaciones</li>
              <li>Podés agregar más información después de crear el ticket</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setCreandoTicket(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Crear Ticket
            </button>
          </div>
        </form>
      </div>
    )
  }

  // =====================================================
  // VER TICKET
  // =====================================================

  const VerTicket = () => {
    const [nuevoMensaje, setNuevoMensaje] = useState("")

    if (!selectedTicket) return null

    const handleEnviarMensaje = () => {
      if (!nuevoMensaje.trim() || !currentUser) return

      setTickets(prev => prev.map(t => {
        if (t.id === selectedTicket.id) {
          const nuevosMensajes = [...t.mensajes, {
            fecha: new Date().toISOString(),
            usuario: currentUser.nombre,
            mensaje: nuevoMensaje,
            es_soporte: false
          }]
          setSelectedTicket({ ...t, mensajes: nuevosMensajes })
          return { ...t, mensajes: nuevosMensajes }
        }
        return t
      }))

      setNuevoMensaje("")
    }

    const getEstadoColor = (estado: string) => {
      switch (estado) {
        case "abierto": return "bg-blue-100 text-blue-700"
        case "en_progreso": return "bg-amber-100 text-amber-700"
        case "pendiente_usuario": return "bg-purple-100 text-purple-700"
        case "resuelto": return "bg-green-100 text-green-700"
        case "cerrado": return "bg-gray-100 text-gray-600"
        default: return "bg-gray-100 text-gray-600"
      }
    }

    const getPrioridadColor = (prioridad: string) => {
      switch (prioridad) {
        case "baja": return "bg-gray-100 text-gray-600"
        case "media": return "bg-blue-100 text-blue-700"
        case "alta": return "bg-orange-100 text-orange-700"
        case "urgente": return "bg-red-100 text-red-700"
        default: return "bg-gray-100 text-gray-600"
      }
    }

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
<BotonVolver onClick={() => setSelectedTicket(null)} variant="minimal" texto="" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-gray-500 font-mono">{selectedTicket.numero}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(selectedTicket.estado)}`}>
                {selectedTicket.estado.replace('_', ' ')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPrioridadColor(selectedTicket.prioridad)}`}>
                {selectedTicket.prioridad}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{selectedTicket.asunto}</h1>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Conversación */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Mensajes */}
            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {selectedTicket.mensajes.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.es_soporte ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] ${msg.es_soporte ? 'bg-gray-100' : 'bg-emerald-50'} rounded-lg p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-medium ${msg.es_soporte ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {msg.usuario}
                      </span>
                      {msg.es_soporte && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">Soporte</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.mensaje}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(msg.fecha).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input nuevo mensaje */}
            {selectedTicket.estado !== "cerrado" && selectedTicket.estado !== "resuelto" && (
              <div className="border-t p-4">
                <div className="flex gap-3">
                  <textarea
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    placeholder="Escribí tu mensaje..."
                    rows={3}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                  />
                  <div className="flex flex-col gap-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 border rounded-lg">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleEnviarMensaje}
                      disabled={!nuevoMensaje.trim()}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-medium text-gray-900 mb-3">Detalles</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Creado: {new Date(selectedTicket.fecha).toLocaleDateString('es-AR')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Tag className="w-4 h-4" />
                  <span>Categoría: {selectedTicket.categoria}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageSquare className="w-4 h-4" />
                  <span>{selectedTicket.mensajes.length} mensajes</span>
                </div>
              </div>
            </div>

            {selectedTicket.estado === "resuelto" && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Ticket Resuelto</span>
                </div>
                <p className="text-sm text-green-600">
                  Si el problema persiste, podés reabrir el ticket o crear uno nuevo.
                </p>
              </div>
            )}

            {selectedTicket.archivos && selectedTicket.archivos.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-medium text-gray-900 mb-3">Archivos adjuntos</h3>
                <div className="space-y-2">
                  {selectedTicket.archivos.map((archivo, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
                      <Paperclip className="w-4 h-4" />
                      <span className="truncate">{archivo}</span>
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

  // =====================================================
  // LISTA DE TICKETS
  // =====================================================

  if (creandoTicket) return <CrearTicketForm />
  if (selectedTicket) return <VerTicket />

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Mis Tickets</h1>
          <p className="text-gray-500 mt-1">Gestione sus solicitudes de soporte</p>
        </div>
        <button
          onClick={() => setCreandoTicket(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{tickets.filter(t => t.usuario_id === currentUser?.id).length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Abiertos</p>
          <p className="text-2xl font-bold text-blue-600">{estadosCount.abierto}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">En Progreso</p>
          <p className="text-2xl font-bold text-amber-600">{estadosCount.en_progreso}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Resueltos</p>
          <p className="text-2xl font-bold text-green-600">{estadosCount.resuelto}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tickets..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="abierto">Abiertos</option>
            <option value="en_progreso">En Progreso</option>
            <option value="pendiente_usuario">Pendiente Usuario</option>
            <option value="resuelto">Resueltos</option>
            <option value="cerrado">Cerrados</option>
          </select>

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todos">Todas las categorías</option>
            <option value="soporte">Soporte Técnico</option>
            <option value="error">Reporte de Error</option>
            <option value="mejora">Solicitud de Mejora</option>
            <option value="consulta">Consulta General</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {misTickets.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No hay tickets</p>
            <p className="text-sm mt-1">Creá un nuevo ticket para solicitar soporte</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Ticket</th>
                <th className="text-left py-3 px-4">Asunto</th>
                <th className="text-left py-3 px-4">Categoría</th>
                <th className="text-center py-3 px-4">Prioridad</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="text-left py-3 px-4">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {misTickets.map(ticket => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-emerald-700">{ticket.numero}</span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900 truncate max-w-xs">{ticket.asunto}</p>
                    <p className="text-xs text-gray-500">{new Date(ticket.fecha).toLocaleDateString('es-AR')}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 capitalize">{ticket.categoria}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.prioridad === 'baja' ? 'bg-gray-100 text-gray-600' :
                      ticket.prioridad === 'media' ? 'bg-blue-100 text-blue-700' :
                      ticket.prioridad === 'alta' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {ticket.prioridad}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.estado === 'abierto' ? 'bg-blue-100 text-blue-700' :
                      ticket.estado === 'en_progreso' ? 'bg-amber-100 text-amber-700' :
                      ticket.estado === 'pendiente_usuario' ? 'bg-purple-100 text-purple-700' :
                      ticket.estado === 'resuelto' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ticket.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-500">
                      {new Date(ticket.mensajes[ticket.mensajes.length - 1]?.fecha || ticket.fecha).toLocaleString('es-AR')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
