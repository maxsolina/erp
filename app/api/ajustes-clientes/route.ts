import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get("cliente_id")
  const estado = searchParams.get("estado")
  const conSaldo = searchParams.get("con_saldo") === "true"
  const categoria = searchParams.get("categoria")

  let query = supabase
    .from("ajustes_clientes")
    .select("*, sucursales(nombre)")
    .order("created_at", { ascending: false })

  if (clienteId) query = query.eq("cliente_id", clienteId)
  // estado="activo" acepta también "publicado" (compat con dos convenciones).
  // Cuando el caller pide un estado específico, devolvemos las que matchean,
  // pero también las del estado "primo" (activo↔publicado) para tolerar el
  // comentario en la DB que dice "ajustes_clientes solo permite 'activo'".
  if (estado) {
    if (estado === "activo" || estado === "publicado") {
      query = query.in("estado", ["activo", "publicado"])
    } else {
      query = query.eq("estado", estado)
    }
  }
  if (categoria) query = query.eq("categoria", categoria)

  const { data, error } = await query
  if (error) return dbError(error)

  const mapped = (data ?? []).map((a: any) => ({
    ...a,
    sucursal: a.sucursales?.nombre ?? a.sucursal ?? "",
    // saldo_disponible: si la columna existe la usa; si no, cae a total
    saldo_disponible: a.saldo_disponible ?? a.total,
    sucursales: undefined,
  }))

  const filtered = conSaldo
    ? mapped.filter((a: any) => Number(a.saldo_disponible ?? 0) > 0)
    : mapped

  return NextResponse.json(filtered)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  // tipo es solo metadata del front para elegir prefijo (NC/ND).
  // No es una columna de la tabla.
  const tipo = body.tipo === "nota_debito" ? "nota_debito" : "nota_credito"
  const prefix = tipo === "nota_debito" ? "ND-A" : "NC-A"

  // Generar correlativo contando por prefijo de número (no por columna `tipo`)
  const { count } = await supabase
    .from("ajustes_clientes")
    .select("*", { count: "exact", head: true })
    .like("numero", `${prefix}-%`)
  const seq = (count ?? 0) + 1
  const numero = `${prefix}-${String(seq).padStart(5, "0")}`

  // Sólo columnas que realmente existen en la tabla
  const insertData: Record<string, any> = {
    numero,
    fecha: body.fecha,
    cliente_id: body.cliente_id,
    cliente_nombre: body.cliente_nombre,
    estado: body.estado ?? "publicado",
    concepto: body.concepto,
    moneda: body.moneda ?? "ARS",
    categoria: body.categoria ?? null,
    nota_venta_numero: body.nota_venta_numero ?? null,
    toma_equipo_id: body.toma_equipo_id ?? null,
    sucursal_id: body.sucursal_id ?? null,
    lineas: body.lineas ?? [],
    total: body.total ?? 0,
  }

  const { data, error } = await supabase
    .from("ajustes_clientes")
    .insert(insertData)
    .select()
    .single()
  if (error) return dbError(error)

  await registrarEvento(supabase, {
    tipo_documento: tipo === "nota_debito" ? "nota_debito" : "nota_credito",
    documento_id: data.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `${tipo === "nota_debito" ? "Nota de Débito" : "Nota de Crédito"} ${data.numero}${body.cliente_nombre ? ` — ${body.cliente_nombre}` : ""}`,
  })

  return NextResponse.json({ ok: true, id: data.id, numero: data.numero })
}
