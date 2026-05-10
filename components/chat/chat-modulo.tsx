"use client"

// ─── Módulo de Mensajes (chat interno tipo WhatsApp) ────────────────────────
//
// Layout: split panel — lista de conversaciones a la izquierda, chat
// abierto a la derecha. Funciona en una sola página `/mensajes`.
//
// Realtime: nos suscribimos a INSERTs en chat_mensajes para recibir
// mensajes nuevos sin polling. Cuando llega uno:
//   - Si es de la conv abierta: lo agregamos a la lista de mensajes.
//   - Si es de otra conv: actualizamos el contador de no leídos.
//
// Privacidad: banner permanente arriba avisando que las conversaciones
// son visibles para administradores (transparencia legal).

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Send, MessageCircle, Plus, Search, Pencil, Trash2, X, Check, Users, Eye, AlertTriangle } from "lucide-react"

interface UsuarioMin {
  id: number
  nombre: string
  avatar_url?: string | null
  email?: string
  is_superuser?: boolean
}

interface Mensaje {
  id: string
  conversacion_id: string
  remitente_id: number
  tipo: "texto" | "imagen" | "archivo" | "sistema"
  contenido: string | null
  adjunto_url: string | null
  adjunto_nombre: string | null
  reply_to_id: string | null
  editado_at: string | null
  eliminado_at: string | null
  created_at: string
  remitente?: UsuarioMin
}

interface Participante {
  usuario_id: number
  rol: "admin" | "miembro"
  last_read_at?: string | null
  usuario?: UsuarioMin
}

interface Conversacion {
  id: string
  tipo: "directo" | "grupo"
  nombre: string | null
  imagen_url: string | null
  ultimo_mensaje_at: string | null
  participantes: Participante[]
  ultimo_mensaje: {
    contenido: string | null
    tipo: string
    remitente_nombre: string | null
    es_propio: boolean
    eliminado_at: string | null
    created_at: string
  } | null
  no_leidos: number
}

interface ChatModuloProps {
  yoId: number
  yoNombre: string
  esSuperuser: boolean
  /** Si es true arrancamos en vista admin (lista todas las convos del ERP). */
  modoAdmin?: boolean
}

export default function ChatModulo({ yoId, yoNombre, esSuperuser, modoAdmin = false }: ChatModuloProps) {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [convActivaId, setConvActivaId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [cargandoConv, setCargandoConv] = useState(true)
  const [cargandoMsgs, setCargandoMsgs] = useState(false)
  const [nuevoMensaje, setNuevoMensaje] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [searchConv, setSearchConv] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [vistaAdmin, setVistaAdmin] = useState(modoAdmin && esSuperuser)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  const mensajesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // ─── Cargar lista de conversaciones ───────────────────────────────────
  const cargarConvs = async () => {
    setCargandoConv(true)
    const url = vistaAdmin ? "/api/chat/admin/conversaciones" : "/api/chat/conversaciones"
    const r = await fetch(url).catch(() => null)
    if (!r?.ok) { setConversaciones([]); setCargandoConv(false); return }
    const d = await r.json().catch(() => [])
    setConversaciones(Array.isArray(d) ? d : [])
    setCargandoConv(false)
  }

  useEffect(() => { cargarConvs() }, [vistaAdmin])

  // ─── Cargar mensajes de la conversación activa ────────────────────────
  useEffect(() => {
    if (!convActivaId) { setMensajes([]); return }
    let cancelado = false
    setCargandoMsgs(true)
    fetch(`/api/chat/conversaciones/${convActivaId}/mensajes`)
      .then(r => r.json())
      .then(d => {
        if (cancelado) return
        setMensajes(Array.isArray(d) ? d : [])
        setCargandoMsgs(false)
      })
      .catch(() => { if (!cancelado) setCargandoMsgs(false) })

    // Marcar como leído
    fetch(`/api/chat/conversaciones/${convActivaId}/leer`, { method: "PATCH" })
      .then(() => {
        // Actualizar el contador local en la lista de convs
        setConversaciones(prev => prev.map(c => c.id === convActivaId ? { ...c, no_leidos: 0 } : c))
      })
      .catch(() => {})

    return () => { cancelado = true }
  }, [convActivaId])

  // Auto-scroll al fondo cuando llegan mensajes — usamos "auto" (instantáneo)
  // en lugar de "smooth" para que no haya lag percibido al mandar mensajes
  // con optimistic UI. La animación suave se siente "lenta" en chat.
  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [mensajes])

  // ─── Realtime: nuevos mensajes ────────────────────────────────────────
  // Nos suscribimos a INSERTs en chat_mensajes. Si el mensaje pertenece a la
  // conv activa, lo añadimos al panel; sino actualizamos el contador.
  // Como `usuarios` tiene RLS restrictiva, no podemos resolver el remitente
  // desde el browser; en su lugar refetcheamos la lista de mensajes (que el
  // server devuelve enriquecida con el nombre del remitente).
  useEffect(() => {
    const channel = supabase
      .channel("chat:mensajes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensajes" },
        async (payload) => {
          const m = payload.new as Mensaje
          if (m.remitente_id === yoId) return  // mi propio mensaje ya lo manejé en POST

          if (m.conversacion_id === convActivaId) {
            // Refetch la conv activa — el endpoint enriquece con el remitente.
            const r = await fetch(`/api/chat/conversaciones/${m.conversacion_id}/mensajes`)
            if (r.ok) {
              const lista = await r.json()
              if (Array.isArray(lista)) setMensajes(lista)
            }
            // Marcar como leído inmediatamente (estoy mirando)
            fetch(`/api/chat/conversaciones/${m.conversacion_id}/leer`, { method: "PATCH" })
          } else {
            // Otra conv: incrementar contador y refrescar timestamp
            setConversaciones(prev => prev.map(c =>
              c.id === m.conversacion_id
                ? { ...c, no_leidos: c.no_leidos + 1, ultimo_mensaje_at: m.created_at }
                : c
            ))
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_mensajes" },
        (payload) => {
          // Edición o borrado: actualizar el mensaje en la lista
          const m = payload.new as Mensaje
          setMensajes(prev => prev.map(x => x.id === m.id ? { ...x, ...m, remitente: x.remitente } : x))
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, convActivaId, yoId])

  // ─── Enviar mensaje (optimistic UI) ───────────────────────────────────
  // El mensaje aparece INSTANTÁNEAMENTE en la conversación con un id temporal
  // (`temp-...`). Después se manda al server en background; cuando responde
  // reemplazamos el temp por el real (con id de DB). Si falla, marcamos el
  // mensaje como _fallido y mostramos botón de reintentar.
  // Esto elimina la latencia percibida — el usuario nunca espera al servidor.
  async function enviar() {
    if (!convActivaId || !nuevoMensaje.trim()) return
    const txt = nuevoMensaje
    const conv = convActivaId
    setNuevoMensaje("")

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimisticMsg: Mensaje = {
      id: tempId,
      conversacion_id: conv,
      remitente_id: yoId,
      tipo: "texto",
      contenido: txt,
      adjunto_url: null,
      adjunto_nombre: null,
      reply_to_id: null,
      editado_at: null,
      eliminado_at: null,
      created_at: new Date().toISOString(),
      remitente: { id: yoId, nombre: yoNombre },
    }
    setMensajes(prev => [...prev, optimisticMsg])
    // Actualizar la lista de convs inmediatamente también
    setConversaciones(prev => prev.map(c =>
      c.id === conv
        ? { ...c, ultimo_mensaje_at: optimisticMsg.created_at, ultimo_mensaje: { contenido: txt, tipo: "texto", remitente_nombre: yoNombre, es_propio: true, eliminado_at: null, created_at: optimisticMsg.created_at } }
        : c,
    ))

    try {
      const r = await fetch(`/api/chat/conversaciones/${conv}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido: txt }),
      })
      if (r.ok) {
        const m = await r.json()
        // Reemplazar el temp por el real (mismo contenido, id de DB).
        // Mantenemos remitente del optimistic si el server no lo trae.
        setMensajes(prev => prev.map(x =>
          x.id === tempId ? { ...m, remitente: m.remitente ?? x.remitente } : x,
        ))
      } else {
        const e = await r.json().catch(() => ({}))
        // Marcamos como fallido (campo _failed) para mostrar UI de error.
        setMensajes(prev => prev.map(x =>
          x.id === tempId ? ({ ...x, _failed: true, _error: e?.error ?? "Error al enviar" } as Mensaje & { _failed?: boolean; _error?: string }) : x,
        ))
      }
    } catch (err) {
      setMensajes(prev => prev.map(x =>
        x.id === tempId ? ({ ...x, _failed: true, _error: "Sin conexión" } as Mensaje & { _failed?: boolean; _error?: string }) : x,
      ))
    }
  }

  // ─── Editar / borrar ──────────────────────────────────────────────────
  async function guardarEdicion(msgId: string) {
    if (!editText.trim()) return
    const r = await fetch(`/api/chat/mensajes/${msgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: editText }),
    })
    if (r.ok) {
      const m = await r.json()
      setMensajes(prev => prev.map(x => x.id === msgId ? { ...x, ...m, remitente: x.remitente } : x))
      setEditandoId(null)
      setEditText("")
    } else {
      const e = await r.json().catch(() => ({}))
      alert(e?.error ?? "No se pudo editar")
    }
  }

  async function borrar(msgId: string) {
    if (!confirm("¿Eliminar este mensaje para todos?")) return
    const r = await fetch(`/api/chat/mensajes/${msgId}`, { method: "DELETE" })
    if (r.ok) {
      setMensajes(prev => prev.map(x => x.id === msgId ? { ...x, eliminado_at: new Date().toISOString(), contenido: null, adjunto_url: null } : x))
    }
  }

  // ─── Helpers de UI ────────────────────────────────────────────────────
  /** Para conversaciones 1-a-1 muestro el nombre del otro participante. */
  function nombreConv(c: Conversacion): string {
    if (c.tipo === "grupo") return c.nombre ?? "Grupo sin nombre"
    const otro = c.participantes.find(p => p.usuario_id !== yoId)?.usuario
    return otro?.nombre ?? "Conversación"
  }

  function inicialesAvatar(nombre: string): string {
    return nombre.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()
  }

  function formatHora(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  }

  function formatFechaCorta(iso: string): string {
    const d = new Date(iso)
    const hoy = new Date()
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1)
    if (d.toDateString() === hoy.toDateString()) return formatHora(iso)
    if (d.toDateString() === ayer.toDateString()) return "Ayer"
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
  }

  const convsFiltradas = useMemo(() => {
    if (!searchConv.trim()) return conversaciones
    const q = searchConv.toLowerCase()
    return conversaciones.filter(c => nombreConv(c).toLowerCase().includes(q))
  }, [conversaciones, searchConv])

  const convActiva = conversaciones.find(c => c.id === convActivaId) ?? null

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-44px)]">
      {/* Banner de transparencia legal — siempre visible */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-800 flex items-center gap-2 flex-shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Estas conversaciones son herramienta de trabajo. Los administradores pueden auditar su contenido.
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo: lista de conversaciones */}
        <aside className="w-80 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-bold text-amber-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {vistaAdmin ? "Todas las conversaciones" : "Mensajes"}
            </h2>
            <div className="flex items-center gap-1">
              {esSuperuser && (
                <button
                  type="button"
                  onClick={() => { setVistaAdmin(v => !v); setConvActivaId(null) }}
                  title={vistaAdmin ? "Volver a mis chats" : "Ver todas las conversaciones (admin)"}
                  className={`p-1.5 rounded-md text-xs ${vistaAdmin ? "bg-indigo-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
              {!vistaAdmin && (
                <button
                  type="button"
                  onClick={() => setShowNewChat(true)}
                  title="Nuevo chat"
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Buscador */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchConv}
                onChange={e => setSearchConv(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {cargandoConv ? (
              <div className="p-4 text-center text-xs text-gray-400">Cargando...</div>
            ) : convsFiltradas.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                {vistaAdmin ? "Sin conversaciones en el ERP." : "Sin conversaciones todavía. Apretá + para empezar."}
              </div>
            ) : (
              convsFiltradas.map(c => {
                const activa = c.id === convActivaId
                const nombre = nombreConv(c)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConvActivaId(c.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 flex items-center gap-3 ${activa ? "bg-indigo-50" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium ${c.tipo === "grupo" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                      {c.tipo === "grupo" ? <Users className="w-4 h-4" /> : inicialesAvatar(nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">{nombre}</span>
                        {c.ultimo_mensaje_at && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{formatFechaCorta(c.ultimo_mensaje_at)}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 truncate">
                          {c.ultimo_mensaje?.eliminado_at
                            ? <em className="text-gray-400">Mensaje eliminado</em>
                            : c.ultimo_mensaje
                              ? <>
                                  {c.ultimo_mensaje.es_propio && <span className="text-gray-400">Vos: </span>}
                                  {c.ultimo_mensaje.tipo === "imagen" ? "📷 Imagen" :
                                   c.ultimo_mensaje.tipo === "archivo" ? "📎 Archivo" :
                                   (c.ultimo_mensaje.contenido ?? "")}
                                </>
                              : <span className="text-gray-400 italic">Sin mensajes</span>}
                        </span>
                        {c.no_leidos > 0 && (
                          <span className="bg-indigo-900 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center flex-shrink-0">
                            {c.no_leidos}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Panel derecho: chat activo */}
        <main className="flex-1 flex flex-col bg-gray-50 min-w-0">
          {!convActiva ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-16 h-16 mb-3 text-gray-200" />
              <p className="text-sm">{vistaAdmin ? "Elegí una conversación para auditarla" : "Elegí un chat para empezar"}</p>
            </div>
          ) : (
            <>
              {/* Header del chat activo */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium ${convActiva.tipo === "grupo" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                    {convActiva.tipo === "grupo" ? <Users className="w-4 h-4" /> : inicialesAvatar(nombreConv(convActiva))}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{nombreConv(convActiva)}</div>
                    {convActiva.tipo === "grupo" && (
                      <div className="text-xs text-gray-500">
                        {convActiva.participantes.map(p => p.usuario?.nombre).filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                {vistaAdmin && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                    Modo auditor
                  </span>
                )}
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {cargandoMsgs ? (
                  <div className="text-center text-xs text-gray-400">Cargando mensajes...</div>
                ) : mensajes.length === 0 ? (
                  <div className="text-center text-xs text-gray-400">Sin mensajes — empezá la conversación.</div>
                ) : (
                  mensajes.map(m => {
                    const propio = m.remitente_id === yoId
                    const edicionActiva = editandoId === m.id
                    const fallido = (m as any)._failed === true
                    const pendiente = m.id.startsWith("temp-") && !fallido
                    return (
                      <div key={m.id} className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] group ${propio ? "ml-auto" : ""} ${pendiente ? "opacity-70" : ""}`}>
                          {convActiva.tipo === "grupo" && !propio && (
                            <div className="text-xs text-indigo-700 font-medium mb-0.5 ml-3">
                              {m.remitente?.nombre ?? "—"}
                            </div>
                          )}
                          <div className={`relative rounded-2xl px-3 py-2 text-sm ${
                            m.eliminado_at
                              ? "bg-gray-100 text-gray-400 italic"
                              : propio
                                ? "bg-indigo-900 text-white"
                                : "bg-white border border-gray-200 text-gray-900"
                          }`}>
                            {m.eliminado_at ? (
                              <span>Mensaje eliminado</span>
                            ) : edicionActiva ? (
                              <div className="flex flex-col gap-1.5">
                                <textarea
                                  autoFocus
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  rows={2}
                                  className="text-gray-900 bg-white rounded px-2 py-1 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => { setEditandoId(null); setEditText("") }}
                                    className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => guardarEdicion(m.id)}
                                    className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="whitespace-pre-wrap break-words">{m.contenido}</div>
                                <div className={`flex items-center gap-1 text-[10px] mt-1 ${propio ? "text-indigo-200" : "text-gray-400"}`}>
                                  <span>{formatHora(m.created_at)}</span>
                                  {m.editado_at && <span className="italic">(editado)</span>}
                                  {pendiente && <span className="italic">enviando…</span>}
                                  {fallido && <span className="text-red-300 font-medium">⚠ falló</span>}
                                </div>
                              </>
                            )}
                          </div>
                          {/* Acciones (solo en mensajes propios, no eliminados, no en modo admin) */}
                          {propio && !m.eliminado_at && !edicionActiva && !vistaAdmin && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1 mt-0.5">
                              <button
                                type="button"
                                onClick={() => { setEditandoId(m.id); setEditText(m.contenido ?? "") }}
                                className="text-gray-400 hover:text-gray-600 p-1 text-xs"
                                title="Editar"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => borrar(m.id)}
                                className="text-gray-400 hover:text-red-600 p-1 text-xs"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={mensajesEndRef} />
              </div>

              {/* Input de nuevo mensaje (oculto en modo admin) */}
              {!vistaAdmin && (
                <form
                  onSubmit={e => { e.preventDefault(); enviar() }}
                  className="px-4 py-3 border-t border-gray-200 bg-white flex items-end gap-2 flex-shrink-0"
                >
                  <textarea
                    value={nuevoMensaje}
                    onChange={e => setNuevoMensaje(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        enviar()
                      }
                    }}
                    rows={1}
                    placeholder="Escribí un mensaje…"
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 max-h-32"
                  />
                  <button
                    type="submit"
                    disabled={!nuevoMensaje.trim()}
                    className="bg-indigo-900 hover:bg-indigo-800 text-white p-2 rounded-lg disabled:opacity-50"
                    title="Enviar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal "Nuevo chat" */}
      {showNewChat && (
        <NuevoChatModal
          yoId={yoId}
          onClose={() => setShowNewChat(false)}
          onCreado={async (convId) => {
            setShowNewChat(false)
            await cargarConvs()
            setConvActivaId(convId)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal: nuevo chat ─────────────────────────────────────────────────────
function NuevoChatModal({
  yoId, onClose, onCreado,
}: {
  yoId: number
  onClose: () => void
  onCreado: (convId: string) => void
}) {
  const [usuarios, setUsuarios] = useState<UsuarioMin[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")
  const [tipo, setTipo] = useState<"directo" | "grupo">("directo")
  const [nombreGrupo, setNombreGrupo] = useState("")
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/chat/usuarios").then(r => r.json()).then(d => setUsuarios(Array.isArray(d) ? d : []))
  }, [])

  const filtrados = useMemo(() => {
    if (!search.trim()) return usuarios
    const q = search.toLowerCase()
    return usuarios.filter(u => u.nombre.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q))
  }, [usuarios, search])

  // Si seleccionan más de uno, automáticamente sugerimos modo grupo
  useEffect(() => {
    if (seleccionados.size > 1) setTipo("grupo")
    else if (seleccionados.size === 1) setTipo("directo")
  }, [seleccionados.size])

  function toggleUser(id: number) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function crear() {
    setError(null)
    if (seleccionados.size === 0) { setError("Elegí al menos un usuario"); return }
    if (tipo === "grupo" && !nombreGrupo.trim()) { setError("El grupo necesita un nombre"); return }
    setCreando(true)
    const r = await fetch("/api/chat/conversaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        participantes_ids: Array.from(seleccionados),
        nombre: tipo === "grupo" ? nombreGrupo.trim() : null,
      }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(d?.error ?? "No se pudo crear la conversación")
      setCreando(false)
      return
    }
    onCreado(d.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Nueva conversación</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b flex gap-2 flex-shrink-0">
          {(["directo", "grupo"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium ${tipo === t ? "bg-indigo-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {t === "directo" ? "1 a 1" : "Grupo"}
            </button>
          ))}
        </div>

        {tipo === "grupo" && (
          <div className="px-5 py-3 border-b flex-shrink-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del grupo</label>
            <input
              type="text"
              value={nombreGrupo}
              onChange={e => setNombreGrupo(e.target.value)}
              placeholder="Ej: Vendedores Centro"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        <div className="px-5 py-2 border-b flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtrados.map(u => {
            const sel = seleccionados.has(u.id)
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleUser(u.id)}
                className={`w-full text-left px-5 py-2 border-b border-gray-100 hover:bg-gray-50 flex items-center gap-3 ${sel ? "bg-indigo-50" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {u.nombre.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">{u.nombre}</div>
                  {u.email && <div className="text-xs text-gray-500 truncate">{u.email}</div>}
                </div>
                {sel && <Check className="w-4 h-4 text-indigo-700 flex-shrink-0" />}
              </button>
            )
          })}
          {filtrados.length === 0 && (
            <div className="p-6 text-center text-xs text-gray-400">Sin resultados</div>
          )}
        </div>

        {error && (
          <div className="px-5 py-2 border-t text-xs text-red-600 bg-red-50 flex-shrink-0">{error}</div>
        )}

        <div className="px-5 py-3 border-t flex justify-between items-center flex-shrink-0">
          <span className="text-xs text-gray-500">{seleccionados.size} seleccionado{seleccionados.size === 1 ? "" : "s"}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={crear}
              disabled={creando || seleccionados.size === 0}
              className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded hover:bg-indigo-800 disabled:opacity-50"
            >
              {creando ? "Creando..." : "Iniciar conversación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
