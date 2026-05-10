"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { X } from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MedioPagoResult {
  valor_id: string
  valor_nombre: string
  valor_tipo: string
  valor_subtipo: string | null
  moneda: string
  importe: number
  importe_ars?: number
  tipo_cotizacion?: string
  cotizacion?: number
  // banco
  tipo_operacion?: string
  numero_operacion?: string
  fecha_operacion?: string
  // cheque_tercero
  banco_id?: string
  banco_nombre?: string
  es_electronico?: boolean
  sucursal_bancaria?: string
  cod_postal?: string
  serie?: string
  numero_cheque?: string
  propio?: boolean
  cuit_emisor?: string
  endosable?: boolean
  vencimiento_cheque?: string
  numero_cuenta_cheque?: string
  // tarjeta
  tarjeta_id?: number
  tarjeta_nombre?: string
  cuotas?: number
  ultimos_4?: string
  vto_mm?: string
  vto_aa?: string
  banco_emisor_id?: string
  banco_emisor_nombre?: string
  numero_lote?: string
  codigo_autorizacion?: string
  tipo_doc?: string
  numero_doc?: string
  numero_cupon?: string
  fecha_cupon?: string
  // rendicion_gastos / fondo_fijo
  concepto?: string
  responsable?: string
  fecha_valor?: string
  // ajuste caja
  tipo_movimiento?: "entrada" | "salida"
  // shared
  observaciones?: string
}

interface ValorCaja {
  id: string
  nombre: string
  moneda: string
  tipo: string
  subtipo: string | null
}

interface BancoData {
  id: string
  nombre: string
}

interface TarjetaData {
  id: number
  nombre: string
  tipo: string
  recargo_pct?: number
}

export interface ModalMedioPagoProps {
  cajaId: string
  showTipoMovimiento?: boolean
  defaultTipoMovimiento?: "entrada" | "salida"
  puedeEditarCotizacion?: boolean
  onGuardar: (result: MedioPagoResult, yNuevo: boolean) => void
  onCerrar: () => void
}

// ─── Componente Principal ────────────────────────────────────────────────────

export function ModalMedioPago({
  cajaId,
  showTipoMovimiento = false,
  defaultTipoMovimiento = "salida",
  puedeEditarCotizacion = false,
  onGuardar,
  onCerrar,
}: ModalMedioPagoProps) {
  const [valoresCaja, setValoresCaja] = useState<ValorCaja[]>([])
  const [bancos, setBancos] = useState<BancoData[]>([])
  const [tarjetas, setTarjetas] = useState<TarjetaData[]>([])
  const [tiposCotizacion, setTiposCotizacion] = useState<string[]>([])

  // campo común
  const [valorId, setValorId] = useState("")
  const [importe, setImporte] = useState("")
  const [tipoMovimiento, setTipoMovimiento] = useState<"entrada" | "salida">(defaultTipoMovimiento)
  const [obs, setObs] = useState("")

  // moneda extranjera
  const [tipoCot, setTipoCot] = useState("")
  const [cotizacion, setCotizacion] = useState("")

  // banco
  const [bancoTipoOp, setBancoTipoOp] = useState("Transferencia")
  const [bancoNumOp, setBancoNumOp] = useState("")
  const [bancoFechaOp, setBancoFechaOp] = useState("")

  // cheque_tercero
  const [chqBancoId, setChqBancoId] = useState("")
  const [chqElectronico, setChqElectronico] = useState(false)
  const [chqSucursal, setChqSucursal] = useState("")
  const [chqCodPostal, setChqCodPostal] = useState("")
  const [chqSerie, setChqSerie] = useState("")
  const [chqNumero, setChqNumero] = useState("")
  const [chqPropio, setChqPropio] = useState(false)
  const [chqCuit, setChqCuit] = useState("")
  const [chqEndosable, setChqEndosable] = useState(true)
  const [chqVencimiento, setChqVencimiento] = useState("")
  const [chqNroCuenta, setChqNroCuenta] = useState("")

  // tarjeta
  const [tarjetaId, setTarjetaId] = useState<number | "">("")
  const [tarjetaCuotas, setTarjetaCuotas] = useState(1)
  const [tarjetaUlt4, setTarjetaUlt4] = useState("")
  const [tarjetaVtoMM, setTarjetaVtoMM] = useState("")
  const [tarjetaVtoAA, setTarjetaVtoAA] = useState("")
  const [tarjetaBancoId, setTarjetaBancoId] = useState("")
  const [tarjetaLote, setTarjetaLote] = useState("")
  const [tarjetaAutorizacion, setTarjetaAutorizacion] = useState("")
  const [tarjetaTipoDoc, setTarjetaTipoDoc] = useState("DNI")
  const [tarjetaNumDoc, setTarjetaNumDoc] = useState("")
  const [tarjetaCupon, setTarjetaCupon] = useState("")
  const [tarjetaFechaCupon, setTarjetaFechaCupon] = useState("")

  // rendicion_gastos / fondo_fijo
  const [rfConcepto, setRfConcepto] = useState("")
  const [rfResponsable, setRfResponsable] = useState("")
  const [rfFecha, setRfFecha] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (!cajaId) return
    const supabase = createClient()
    Promise.all([
      supabase
        .from("caja_valores")
        .select("id, nombre, moneda, tipo, subtipo")
        .eq("caja_id", cajaId)
        .eq("activo", true)
        .order("nombre"),
      supabase.from("bancos").select("id, nombre").eq("activo", true).order("nombre"),
      fetch('/api/contabilidad/tipos-cotizacion?activo=true').then(r => r.json()),
      fetch('/api/tarjetas').then(r => r.json()),
    ]).then(([v, b, tipos, tars]) => {
      setValoresCaja(v.data || [])
      setBancos(b.data || [])
      setTarjetas(Array.isArray(tars) ? tars.map((t: { id: number; nombre: string; tipo: string }) => ({
        id: t.id,
        nombre: t.nombre,
        tipo: t.tipo,
        recargo_pct: undefined,
      })) : [])
      if (Array.isArray(tipos) && tipos.length > 0) {
        const nombres: string[] = tipos.map((t: { nombre: string }) => t.nombre)
        setTiposCotizacion(nombres)
        setTipoCot(nombres[0])
      }
    })
  }, [cajaId])

  const valorSel = valoresCaja.find(v => v.id === valorId)
  const moneda = valorSel?.moneda || "ARS"
  const esMonedaExtranjera = moneda !== "ARS"
  const subtipo = valorSel?.subtipo || null
  const importeNum = parseFloat(importe) || 0
  const cotizacionNum = parseFloat(cotizacion) || 0
  const importeArs = esMonedaExtranjera && cotizacionNum > 0 ? importeNum * cotizacionNum : importeNum
  const tarjetaSel = tarjetas.find(t => t.id === tarjetaId)
  const recargoPct = tarjetaSel?.recargo_pct || 0
  const importeConRecargo = tarjetaCuotas > 1 ? importeNum * (1 + recargoPct / 100) : importeNum

  // Auto-completar cotización desde la DB al cambiar tipo o moneda
  useEffect(() => {
    if (!esMonedaExtranjera || !tipoCot) return
    fetch(`/api/contabilidad/cotizaciones?moneda_codigo=${moneda}&tipo=${tipoCot}&latest=true`)
      .then(r => r.json())
      .then((data: { tasa?: number } | null) => {
        if (data?.tasa) setCotizacion(String(data.tasa))
        else setCotizacion("")
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoCot, moneda])

  const resetCampos = () => {
    setImporte("")
    setObs("")
    setCotizacion("")
    setBancoTipoOp("Transferencia")
    setBancoNumOp("")
    setBancoFechaOp("")
    setChqBancoId("")
    setChqElectronico(false)
    setChqSucursal("")
    setChqCodPostal("")
    setChqSerie("")
    setChqNumero("")
    setChqPropio(false)
    setChqCuit("")
    setChqEndosable(true)
    setChqVencimiento("")
    setChqNroCuenta("")
    setTarjetaId("")
    setTarjetaCuotas(1)
    setTarjetaUlt4("")
    setTarjetaVtoMM("")
    setTarjetaVtoAA("")
    setTarjetaBancoId("")
    setTarjetaLote("")
    setTarjetaAutorizacion("")
    setTarjetaTipoDoc("DNI")
    setTarjetaNumDoc("")
    setTarjetaCupon("")
    setTarjetaFechaCupon("")
    setRfConcepto("")
    setRfResponsable("")
    setRfFecha(new Date().toISOString().split("T")[0])
  }

  const handleChangeValor = (id: string) => {
    setValorId(id)
    resetCampos()
  }

  const esValido = () => {
    if (!valorId || importeNum <= 0) {
      // cheque_tercero tiene su propio importe siempre visible
      if (valorSel?.subtipo === "cheque_tercero") {
        if (importeNum <= 0 || !chqNumero || !chqVencimiento || !chqBancoId) return false
        return true
      }
      if (!valorId) return false
      if (importeNum <= 0) return false
    }
    const sub = valorSel?.subtipo
    if (sub === "cheque_tercero") return !!chqNumero && !!chqVencimiento && !!chqBancoId
    if (sub === "tarjeta") return tarjetaId !== ""
    if (sub === "rendicion_gastos" || sub === "fondo_fijo") return !!rfConcepto
    return true
  }

  const construirResult = (): MedioPagoResult => {
    const base: MedioPagoResult = {
      valor_id: valorId,
      valor_nombre: valorSel?.nombre || "",
      valor_tipo: valorSel?.tipo || "efectivo",
      valor_subtipo: subtipo,
      moneda,
      importe: importeNum,
      importe_ars: esMonedaExtranjera ? importeArs : undefined,
      tipo_cotizacion: esMonedaExtranjera ? tipoCot : undefined,
      cotizacion: esMonedaExtranjera && cotizacionNum > 0 ? cotizacionNum : undefined,
      tipo_movimiento: showTipoMovimiento ? tipoMovimiento : undefined,
      observaciones: obs || undefined,
    }

    if (subtipo === "banco") {
      return {
        ...base,
        tipo_operacion: bancoTipoOp,
        numero_operacion: bancoNumOp || undefined,
        fecha_operacion: bancoFechaOp || undefined,
      }
    }

    if (subtipo === "cheque_tercero") {
      const banco = bancos.find(b => b.id === chqBancoId)
      return {
        ...base,
        banco_id: chqBancoId,
        banco_nombre: banco?.nombre,
        es_electronico: chqElectronico,
        sucursal_bancaria: chqSucursal || undefined,
        cod_postal: chqCodPostal || undefined,
        serie: chqSerie || undefined,
        numero_cheque: chqNumero,
        propio: chqPropio,
        cuit_emisor: chqCuit || undefined,
        endosable: chqEndosable,
        vencimiento_cheque: chqVencimiento,
        numero_cuenta_cheque: chqNroCuenta || undefined,
        numero_operacion: chqNumero,
        fecha_operacion: chqVencimiento,
      }
    }

    if (subtipo === "tarjeta") {
      const bancoPag = bancos.find(b => b.id === tarjetaBancoId)
      return {
        ...base,
        tarjeta_id: tarjetaId as number,
        tarjeta_nombre: tarjetaSel?.nombre,
        cuotas: tarjetaCuotas,
        ultimos_4: tarjetaUlt4 || undefined,
        vto_mm: tarjetaVtoMM || undefined,
        vto_aa: tarjetaVtoAA || undefined,
        banco_emisor_id: tarjetaBancoId || undefined,
        banco_emisor_nombre: bancoPag?.nombre,
        numero_lote: tarjetaLote || undefined,
        codigo_autorizacion: tarjetaAutorizacion || undefined,
        tipo_doc: tarjetaNumDoc ? tarjetaTipoDoc : undefined,
        numero_doc: tarjetaNumDoc || undefined,
        numero_cupon: tarjetaCupon || undefined,
        fecha_cupon: tarjetaFechaCupon || undefined,
        importe: importeConRecargo,
      }
    }

    if (subtipo === "rendicion_gastos" || subtipo === "fondo_fijo") {
      return {
        ...base,
        concepto: rfConcepto,
        responsable: rfResponsable || undefined,
        fecha_valor: rfFecha,
      }
    }

    return base
  }

  const handleGuardar = (yNuevo: boolean) => {
    if (!esValido()) return
    onGuardar(construirResult(), yNuevo)
    if (yNuevo) {
      setValorId("")
      resetCampos()
    }
  }

  const cls = "w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
  const lbl = "block text-xs font-medium text-gray-700 mb-1"
  const chk = "flex items-center gap-2 text-sm"

  // ─── Render de campos por subtipo ───────────────────────────────────────

  const renderCampos = () => {
    if (!valorId || !valorSel) return null

    // ── EFECTIVO ──────────────────────────────────────────────────────────
    if (valorSel.tipo === "efectivo") {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Importe *</label>
              <input type="number" value={importe} onChange={e => setImporte(e.target.value)} min="0" step="0.01" className={cls} />
            </div>
            {esMonedaExtranjera && (
              <>
                <div>
                  <label className={lbl}>Tipo Cotización</label>
                  <select
                    value={tipoCot}
                    onChange={e => puedeEditarCotizacion && setTipoCot(e.target.value)}
                    disabled={!puedeEditarCotizacion}
                    className={`${cls} ${!puedeEditarCotizacion ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  >
                    {tiposCotizacion.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>
                    Cotización
                    {!puedeEditarCotizacion && <span className="ml-1 text-xs text-gray-400 font-normal">(solo lectura)</span>}
                  </label>
                  <input
                    type="number"
                    value={cotizacion}
                    onChange={e => puedeEditarCotizacion && setCotizacion(e.target.value)}
                    readOnly={!puedeEditarCotizacion}
                    step="0.0001"
                    className={`${cls} ${!puedeEditarCotizacion ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className={lbl}>Equivalente ARS</label>
                  <p className="text-sm font-semibold text-gray-800 pt-1.5">
                    {importeArs.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )
    }

    // ── BANCO ─────────────────────────────────────────────────────────────
    if (subtipo === "banco") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Tipo de Operación *</label>
            <select value={bancoTipoOp} onChange={e => setBancoTipoOp(e.target.value)} className={cls}>
              <option>Transferencia</option>
              <option>Depósito</option>
              <option>Débito Automático</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Nº Operación</label>
            <input value={bancoNumOp} onChange={e => setBancoNumOp(e.target.value)} className={cls} placeholder="Ref. bancaria o CBU" />
          </div>
          <div>
            <label className={lbl}>Importe *</label>
            <input type="number" value={importe} onChange={e => setImporte(e.target.value)} min="0" step="0.01" className={cls} />
          </div>
          <div>
            <label className={lbl}>Fecha de Operación</label>
            <input type="date" value={bancoFechaOp} onChange={e => setBancoFechaOp(e.target.value)} className={cls} />
          </div>
        </div>
      )
    }

    // ── CHEQUE TERCERO ────────────────────────────────────────────────────
    if (subtipo === "cheque_tercero") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          {/* Columna izquierda */}
          <div className="space-y-2">
            <div>
              <label className={lbl}>Banco *</label>
              <select value={chqBancoId} onChange={e => setChqBancoId(e.target.value)} className={cls}>
                <option value="">Seleccionar...</option>
                {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <label className={chk}>
              <input type="checkbox" checked={chqElectronico} onChange={e => setChqElectronico(e.target.checked)} className="rounded" />
              Electrónico (ECHEQ)
            </label>
            <div>
              <label className={lbl}>Sucursal</label>
              <input value={chqSucursal} onChange={e => setChqSucursal(e.target.value)} className={cls} />
            </div>
            <div>
              <label className={lbl}>Cód. Postal / Plaza</label>
              <input value={chqCodPostal} onChange={e => setChqCodPostal(e.target.value)} className={cls} />
            </div>
            <div>
              <label className={lbl}>Serie</label>
              <input value={chqSerie} onChange={e => setChqSerie(e.target.value)} className={cls} />
            </div>
            <div>
              <label className={lbl}>Nº Cheque *</label>
              <input value={chqNumero} onChange={e => setChqNumero(e.target.value)} className={cls} />
            </div>
          </div>
          {/* Columna derecha */}
          <div className="space-y-2">
            <label className={chk}>
              <input type="checkbox" checked={chqPropio} onChange={e => setChqPropio(e.target.checked)} className="rounded" />
              Propio
            </label>
            <div>
              <label className={lbl}>CUIT del Emisor</label>
              <input value={chqCuit} onChange={e => setChqCuit(e.target.value)} className={cls} />
            </div>
            <label className={chk}>
              <input type="checkbox" checked={chqEndosable} onChange={e => setChqEndosable(e.target.checked)} className="rounded" />
              Endosable
            </label>
            <div>
              <label className={lbl}>Vencimiento *</label>
              <input type="date" value={chqVencimiento} onChange={e => setChqVencimiento(e.target.value)} className={cls} />
            </div>
            <div>
              <label className={lbl}>Importe *</label>
              <input type="number" value={importe} onChange={e => setImporte(e.target.value)} step="0.01" min="0" className={cls} />
            </div>
            <div>
              <label className={lbl}>Número de Cuenta</label>
              <input value={chqNroCuenta} onChange={e => setChqNroCuenta(e.target.value)} className={cls} />
            </div>
          </div>
        </div>
      )
    }

    // ── TARJETA ───────────────────────────────────────────────────────────
    if (subtipo === "tarjeta") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Tarjeta *</label>
            <select
              value={tarjetaId}
              onChange={e => setTarjetaId(e.target.value ? parseInt(e.target.value) : "")}
              className={cls}
            >
              <option value="">Seleccionar...</option>
              {tarjetas.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.tipo === "credito" ? "Crédito" : "Débito"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Importe *</label>
            <input type="number" value={importe} onChange={e => setImporte(e.target.value)} step="0.01" min="0" className={cls} />
          </div>
        </div>
      )
    }

    // ── RENDICIÓN DE GASTOS ───────────────────────────────────────────────
    if (subtipo === "rendicion_gastos") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Concepto *</label>
            <input value={rfConcepto} onChange={e => setRfConcepto(e.target.value)} className={cls} />
          </div>
          <div>
            <label className={lbl}>Responsable</label>
            <input value={rfResponsable} onChange={e => setRfResponsable(e.target.value)} className={cls} />
          </div>
          <div>
            <label className={lbl}>Importe *</label>
            <input type="number" value={importe} onChange={e => setImporte(e.target.value)} step="0.01" min="0" className={cls} />
          </div>
          <div>
            <label className={lbl}>Fecha *</label>
            <input type="date" value={rfFecha} onChange={e => setRfFecha(e.target.value)} className={cls} />
          </div>
        </div>
      )
    }

    // ── FONDO FIJO ────────────────────────────────────────────────────────
    if (subtipo === "fondo_fijo") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={lbl}>Concepto *</label>
            <input value={rfConcepto} onChange={e => setRfConcepto(e.target.value)} className={cls} />
          </div>
          <div>
            <label className={lbl}>Importe *</label>
            <input type="number" value={importe} onChange={e => setImporte(e.target.value)} step="0.01" min="0" className={cls} />
          </div>
          <div>
            <label className={lbl}>Fecha *</label>
            <input type="date" value={rfFecha} onChange={e => setRfFecha(e.target.value)} className={cls} />
          </div>
        </div>
      )
    }

    // fallback banco_cheques sin subtipo configurado
    return (
      <div>
        <label className={lbl}>Importe *</label>
        <input type="number" value={importe} onChange={e => setImporte(e.target.value)} min="0" step="0.01" className={cls} />
      </div>
    )
  }

  const subtipoLabels: Record<string, string> = {
    banco: "Banco",
    cheque_tercero: "Cheque",
    tarjeta: "Tarjeta",
    rendicion_gastos: "Rendición",
    fondo_fijo: "Fondo Fijo",
  }

  // ─── Render Modal ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
          <h3 className="text-lg font-bold text-gray-900">Agregar Medio de Pago</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Forma de pago */}
          <div>
            <label className={lbl}>Forma de Pago *</label>
            <select value={valorId} onChange={e => handleChangeValor(e.target.value)} className={cls}>
              <option value="">
                {!cajaId
                  ? "Seleccioná una caja primero"
                  : valoresCaja.length === 0
                  ? "Sin valores configurados para esta caja"
                  : "Seleccionar..."}
              </option>
              {valoresCaja.map(v => (
                <option key={v.id} value={v.id}>
                  {v.nombre} ({v.moneda})
                  {v.tipo !== "efectivo" && v.subtipo ? ` · ${subtipoLabels[v.subtipo] || v.subtipo}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de movimiento (solo Ajustes de Caja) */}
          {showTipoMovimiento && (
            <div>
              <label className={lbl}>Tipo de Movimiento *</label>
              <div className="flex gap-2">
                {(["entrada", "salida"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoMovimiento(t)}
                    className={`flex-1 px-4 py-2 text-sm rounded-md border transition-colors ${
                      tipoMovimiento === t
                        ? t === "entrada"
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-red-600 text-white border-red-600"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t === "entrada" ? "Entrada" : "Salida"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {tipoMovimiento === "entrada" ? "Suma al saldo de la caja" : "Resta al saldo de la caja"}
              </p>
            </div>
          )}

          {/* Campos según tipo/subtipo */}
          {valorId && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              {renderCampos()}
            </div>
          )}

          {/* Observaciones */}
          {valorId && (
            <div>
              <label className={lbl}>Observaciones</label>
              <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} className={cls} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
          <button onClick={onCerrar} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Descartar
          </button>
          <button
            onClick={() => handleGuardar(true)}
            disabled={!esValido()}
            className="px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg text-sm hover:bg-indigo-50 disabled:opacity-40"
          >
            Guardar y Nuevo
          </button>
          <button
            onClick={() => handleGuardar(false)}
            disabled={!esValido()}
            className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-40"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
