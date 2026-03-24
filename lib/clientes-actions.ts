// Acciones de persistencia de clientes — separadas de ventas-module.tsx
// para evitar conflictos de async/await en el compilador

export async function guardarClienteEnDB(
  payload: {
    nombre: string
    razon_social: string | null
    tipo_documento: string
    numero_documento: string | null
    condicion_iva: string
    email: string | null
    telefono: string | null
    direccion: string | null
    ciudad: string | null
    provincia: string | null
    termino_pago_id: number | null
    vendedor_id: number | null
    activo: boolean
    saldo_cuenta_corriente?: number
    total_facturado?: number
    codigo?: string
  },
  clienteId?: number
): Promise<{ id: number; codigo?: string }> {
  if (clienteId) {
    const res = await fetch(`/api/clientes/${clienteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Error al actualizar cliente")
    }
    const data = await res.json()
    return { id: data.id }
  } else {
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Error al crear cliente")
    }
    const data = await res.json()
    return { id: data.id, codigo: data.codigo }
  }
}
