"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Building2, CheckCircle, DollarSign, MapPin, Phone } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"

interface CategoriaCliente {
  id: number
  nombre: string
  activa: boolean
}

interface Vendedor { id: number; nombre: string }
interface ListaPrecios { id: number; nombre: string; activa?: boolean }
interface TerminoPago { id: number; nombre: string; dias?: number }

interface ClienteData {
  id?: number
  codigo?: string
  nombre?: string
  razon_social?: string | null
  tipo_documento?: string
  numero_documento?: string | null
  posicion_fiscal?: string
  condicion_iva?: string
  direccion?: string | null
  ciudad?: string | null
  provincia?: string | null
  codigo_postal?: string | null
  zona?: string | null
  telefono?: string | null
  celular?: string | null
  email?: string | null
  categoria_id?: number | null
  vendedor_id?: number | null
  lista_precios_id?: number | null
  termino_pago_id?: number | null
  descuento_default?: number | null
  activo?: boolean
}

const POSICIONES_FISCALES = [
  { value: "consumidor_final", label: "Consumidor Final", condicion: "Consumidor Final" },
  { value: "responsable_inscripto", label: "Responsable Inscripto", condicion: "Responsable Inscripto" },
  { value: "monotributista", label: "Monotributista", condicion: "Monotributista" },
  { value: "exento", label: "Exento", condicion: "Exento" },
] as const

function condicionAPosicion(cond: string | undefined | null): string {
  if (!cond) return "consumidor_final"
  const m = POSICIONES_FISCALES.find(p => p.condicion === cond)
  return m?.value ?? "consumidor_final"
}

export default function ClienteForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null

  // Catálogos
  const [categorias, setCategorias] = useState<CategoriaCliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([])
  const [terminosPago, setTerminosPago] = useState<TerminoPago[]>([])
  const [cargandoBase, setCargandoBase] = useState(true)

  // Form state
  const [cargandoCliente, setCargandoCliente] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [nombre, setNombre] = useState("")
  const [nombreFantasia, setNombreFantasia] = useState("")
  const [tipoDocumento, setTipoDocumento] = useState("DNI")
  const [numeroDocumento, setNumeroDocumento] = useState("")
  const [posicionFiscal, setPosicionFiscal] = useState("consumidor_final")
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [direccion, setDireccion] = useState("")
  const [ciudad, setCiudad] = useState("Rosario")
  const [provincia, setProvincia] = useState("Santa Fe")
  const [codigoPostal, setCodigoPostal] = useState("")
  const [zona, setZona] = useState("")
  const [telefono, setTelefono] = useState("")
  const [celular, setCelular] = useState("")
  const [email, setEmail] = useState("")
  const [vendedorId, setVendedorId] = useState<number | null>(null)
  const [listaPreciosId, setListaPreciosId] = useState<number | null>(null)
  const [descuentoDefault, setDescuentoDefault] = useState<number>(0)
  const [terminoPagoId, setTerminoPagoId] = useState<number | null>(null)
  const [codigoExistente, setCodigoExistente] = useState<string | null>(null)

  // ─── Loaders ────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch("/api/categorias-cliente").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/vendedores").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/listas-precios").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/terminos-pago").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([cats, vens, lps, tps]) => {
      if (Array.isArray(cats)) setCategorias(cats)
      if (Array.isArray(vens)) setVendedores(vens)
      if (Array.isArray(lps)) setListasPrecios(lps)
      if (Array.isArray(tps)) setTerminosPago(tps)
      setCargandoBase(false)
    })
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/clientes/${initialId}`)
      .then(async r => {
        if (!r.ok) {
          setErrorCarga(r.status === 404 ? "Cliente no encontrado" : `Error ${r.status}`)
          setCargandoCliente(false)
          return
        }
        const c: ClienteData = await r.json()
        setNombre(c.nombre ?? "")
        setNombreFantasia(c.razon_social ?? "")
        setTipoDocumento(c.tipo_documento ?? "DNI")
        setNumeroDocumento(c.numero_documento ?? "")
        setPosicionFiscal(c.posicion_fiscal ?? condicionAPosicion(c.condicion_iva))
        setCategoriaId(c.categoria_id ?? null)
        setDireccion(c.direccion ?? "")
        setCiudad(c.ciudad ?? "Rosario")
        setProvincia(c.provincia ?? "Santa Fe")
        setCodigoPostal(c.codigo_postal ?? "")
        setZona(c.zona ?? "")
        setTelefono(c.telefono ?? "")
        setCelular(c.celular ?? "")
        setEmail(c.email ?? "")
        setVendedorId(c.vendedor_id ?? null)
        setListaPreciosId(c.lista_precios_id ?? null)
        setDescuentoDefault(Number(c.descuento_default ?? 0))
        setTerminoPagoId(c.termino_pago_id ?? null)
        setCodigoExistente(c.codigo ?? null)
        setCargandoCliente(false)
      })
      .catch(err => {
        console.error(err)
        setErrorCarga("Error de red al cargar el cliente")
        setCargandoCliente(false)
      })
  }, [isEdit, initialId])

  const validar = (): string | null => {
    if (!nombre.trim()) return "El nombre / razón social es obligatorio"
    if (!numeroDocumento.trim()) return "El número de documento es obligatorio"
    if (!categoriaId) return "Debés seleccionar una categoría de cliente"
    if (!listaPreciosId) return "Debés seleccionar una lista de precios"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validar()
    if (err) { setErrorGuardado(err); return }
    if (guardando) return
    setErrorGuardado(null)
    setGuardando(true)

    const condicion = POSICIONES_FISCALES.find(p => p.value === posicionFiscal)?.condicion ?? "Consumidor Final"

    // Payload mínimo: solo columnas que existen seguro en la tabla `clientes`.
    // - razón_social: el monolito guarda ahí el "nombre fantasía" (convención existente).
    // - telefono: combina teléfono fijo + celular si hay ambos (la tabla no
    //   tiene columna celular separada).
    // Campos del form que NO se persisten (porque la columna no existe):
    //   posicion_fiscal, codigo_postal, zona, descuento_default. Se quedan en
    //   la UI por compatibilidad visual con el monolito.
    const telefonoCombinado = [telefono.trim(), celular.trim()].filter(Boolean).join(" / ") || null
    const payload: Record<string, unknown> = {
      nombre: nombre.trim(),
      razon_social: nombreFantasia.trim() || null,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento.trim() || null,
      condicion_iva: condicion,
      direccion: direccion.trim() || null,
      ciudad: ciudad.trim() || null,
      provincia: provincia.trim() || null,
      telefono: telefonoCombinado,
      email: email.trim() || null,
      categoria_id: categoriaId,
      vendedor_id: vendedorId,
      lista_precios_id: listaPreciosId,
      termino_pago_id: terminoPagoId,
      activo: true,
    }

    try {
      let res: Response
      if (isEdit && initialId) {
        res = await fetch(`/api/clientes/${initialId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        // El código del cliente lo genera el backend con MAX + retry para evitar
        // colisiones de unique key (clientes_codigo_key).
        res = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, saldo_cuenta_corriente: 0, total_facturado: 0 }),
        })
      }
      if (!res.ok) {
        const text = await res.text()
        setErrorGuardado(`Error al guardar (HTTP ${res.status}): ${text}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      const id = data.id ?? initialId
      router.push(`/ventas/clientes/${id}`)
    } catch (e: any) {
      setErrorGuardado(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargandoBase || cargandoCliente) {
    return <div className="p-12 text-center text-gray-500">Cargando datos…</div>
  }
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/ventas/clientes")} className="text-indigo-700 hover:underline">
          Volver al listado
        </button>
      </div>
    )
  }

  // Estilos del monolito
  const inputReq = "w-full border border-violet-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
  const inputOpt = "w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
  const labelStyle = "block text-xs font-medium text-gray-600 mb-0.5"

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-2">
        <button onClick={() => router.push("/ventas/clientes")} className="hover:text-emerald-700">Clientes</button>
        {" / "}
        <span className="text-gray-700">
          {isEdit ? `Editar Cliente${codigoExistente ? ` ${codigoExistente}` : ""}` : "Nuevo Cliente"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <BotonVolver onClick={() => router.back()} variant="minimal" texto="" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-amber-900">
            {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </h1>
        </div>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-lg shadow-sm">
        <form onSubmit={handleSubmit} className="p-4">
          {errorGuardado && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-2.5 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorGuardado}</span>
            </div>
          )}

          {/* Sección Identificación */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Identificación
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelStyle}>Nombre / Razón Social *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                  className={inputReq}
                />
              </div>
              <div>
                <label className={labelStyle}>Nombre Fantasía</label>
                <input
                  type="text"
                  value={nombreFantasia}
                  onChange={e => setNombreFantasia(e.target.value)}
                  className={inputOpt}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className={labelStyle}>Tipo Documento *</label>
                <select
                  value={tipoDocumento}
                  onChange={e => setTipoDocumento(e.target.value)}
                  required
                  className={inputReq}
                >
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                </select>
              </div>
              <div>
                <label className={labelStyle}>Número Documento *</label>
                <input
                  type="text"
                  value={numeroDocumento}
                  onChange={e => setNumeroDocumento(e.target.value)}
                  required
                  className={inputReq}
                />
              </div>
              <div>
                <label className={labelStyle}>Posición Fiscal *</label>
                <select
                  value={posicionFiscal}
                  onChange={e => setPosicionFiscal(e.target.value)}
                  required
                  className={inputReq}
                >
                  {POSICIONES_FISCALES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelStyle}>Categoría de Cliente *</label>
              <select
                value={categoriaId ?? ""}
                onChange={e => setCategoriaId(e.target.value ? Number(e.target.value) : null)}
                required
                className={inputReq}
              >
                <option value="">Seleccione una categoría</option>
                {categorias.filter(c => c.activa).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sección Dirección */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Dirección
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelStyle}>Dirección</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  className={inputOpt}
                />
              </div>
              <div>
                <label className={labelStyle}>Ciudad</label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={e => setCiudad(e.target.value)}
                  className={inputOpt}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelStyle}>Provincia</label>
                <input
                  type="text"
                  value={provincia}
                  onChange={e => setProvincia(e.target.value)}
                  className={inputOpt}
                />
              </div>
              <div>
                <label className={labelStyle}>Código Postal</label>
                <input
                  type="text"
                  value={codigoPostal}
                  onChange={e => setCodigoPostal(e.target.value)}
                  className={inputOpt}
                />
              </div>
              <div>
                <label className={labelStyle}>Zona</label>
                <input
                  type="text"
                  value={zona}
                  onChange={e => setZona(e.target.value)}
                  className={inputOpt}
                />
              </div>
            </div>
          </div>

          {/* Sección Contacto */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contacto
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelStyle}>Teléfono</label>
                <input
                  type="text"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className={inputOpt}
                />
              </div>
              <div>
                <label className={labelStyle}>Celular</label>
                <input
                  type="text"
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  className={inputOpt}
                />
              </div>
              <div>
                <label className={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputOpt}
                />
              </div>
            </div>
          </div>

          {/* Sección Comercial */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Información Comercial
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelStyle}>Vendedor</label>
                <select
                  value={vendedorId ?? ""}
                  onChange={e => setVendedorId(e.target.value ? Number(e.target.value) : null)}
                  className={inputOpt}
                >
                  <option value="">Sin asignar</option>
                  {vendedores.map(v => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelStyle}>Lista de Precios por Defecto *</label>
                <select
                  value={listaPreciosId ?? ""}
                  onChange={e => setListaPreciosId(e.target.value ? Number(e.target.value) : null)}
                  required
                  className={inputReq}
                >
                  <option value="">Seleccione una lista</option>
                  {listasPrecios.filter(l => l.activa !== false).map(l => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelStyle}>Descuento Default (%)</label>
                <input
                  type="number"
                  value={descuentoDefault}
                  onChange={e => setDescuentoDefault(Number(e.target.value) || 0)}
                  min={0}
                  max={100}
                  step={0.5}
                  className={inputOpt}
                />
              </div>
              <div>
                <label className={labelStyle}>Término de Pago</label>
                <select
                  value={terminoPagoId ?? ""}
                  onChange={e => setTerminoPagoId(e.target.value ? Number(e.target.value) : null)}
                  className={inputOpt}
                >
                  <option value="">Sin definir</option>
                  {terminosPago.map(tp => (
                    <option key={tp.id} value={tp.id}>{tp.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {guardando ? "Guardando…" : isEdit ? "Guardar Cambios" : "Crear Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
