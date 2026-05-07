import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get("estado")
  const tecnico_id = searchParams.get("tecnico_id")
  const area_id = searchParams.get("area_id")

  let query = supabase
    .from("taller_ordenes_trabajo")
    .select(`
      *,
      taller_areas_reparacion(nombre),
      taller_tipos_ot(nombre, codigo),
      taller_equipos(nombre, marca, modelo),
      taller_fallas!taller_ordenes_trabajo_falla_principal_id_fkey(nombre),
      taller_categorias_reparacion(nombre),
      taller_tecnicos(nombre, tipo),
      taller_motivos_cierre(nombre)
    `)
    .order("fecha_creacion", { ascending: false })

  if (estado) query = query.eq("estado", estado)
  if (tecnico_id) query = query.eq("tecnico_id", tecnico_id)
  if (area_id) query = query.eq("area_id", area_id)

  const { data, error } = await query

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Generar número de OT
  const { data: numData, error: numErr } = await supabase.rpc("generar_numero_ot")
  if (numErr) return NextResponse.json({ error: numErr.message }, { status: 500 })

  // Calcular tiempo teórico
  const fallas_sec_ids = body.fallas_secundarias ?? []
  const { data: tiempoData } = await supabase.rpc("taller_calcular_tiempo_teorico", {
    p_equipo_id: body.equipo_id,
    p_falla_principal_id: body.falla_principal_id,
    p_fallas_secundarias: fallas_sec_ids,
  })

  const { data, error } = await supabase
    .from("taller_ordenes_trabajo")
    .insert([{
      numero: numData,
      sucursal_id: body.sucursal_id ?? null,
      area_id: body.area_id,
      tipo_ot_id: body.tipo_ot_id,
      tipo_tecnico: body.tipo_tecnico ?? null,
      // cliente_id se almacena como INTEGER (matchea clientes.id) — ver
      // migración 100. El select del front manda string; coercemos a número.
      cliente_id: body.cliente_id != null && body.cliente_id !== ""
        ? Number(body.cliente_id)
        : null,
      categoria_cliente: body.categoria_cliente ?? null,
      celular_contacto: body.celular_contacto,
      factura_origen_id: body.factura_origen_id ?? null,
      ot_origen_id: body.ot_origen_id ?? null,
      equipo_id: body.equipo_id,
      falla_principal_id: body.falla_principal_id,
      categoria_reparacion_id: body.categoria_reparacion_id ?? null,
      imei: body.imei ?? null,
      serial_number: body.serial_number ?? null,
      codigo_desbloqueo: body.codigo_desbloqueo ?? null,
      ingresa_apagado: body.ingresa_apagado ?? false,
      ingresa_mojado: body.ingresa_mojado ?? false,
      deja_cargador: body.deja_cargador ?? false,
      requerido_mkt: body.requerido_mkt ?? false,
      presupuesto_estimado: body.presupuesto_estimado ?? null,
      descripcion: body.descripcion ?? null,
      tiempo_reparacion_teorico: tiempoData ?? 0,
      lista_precios_id: body.lista_precios_id ? Number(body.lista_precios_id) : null,
      estado: "borrador",
    }])
    .select()
    .single()

  if (error) return dbError(error)

  // Insertar fallas secundarias
  if (fallas_sec_ids.length && data) {
    const rows = fallas_sec_ids.map((fid: string) => ({
      ot_id: data.id,
      falla_id: fid,
    }))
    await supabase.from("taller_ot_fallas_secundarias").insert(rows)
  }

  // Auto-cargar repuestos sugeridos desde taller_fallas_por_equipo. Si no
  // hay coincidencias, no hace nada — el operador puede cargar repuestos a
  // mano desde la ficha. Si falla, no bloquea la creación de la OT.
  if (data?.id) {
    try {
      const fallaIds: string[] = [
        ...(data.falla_principal_id ? [data.falla_principal_id] : []),
        ...fallas_sec_ids,
      ]
      if (fallaIds.length > 0 && data.equipo_id) {
        const { data: fallaEquipos } = await supabase
          .from("taller_fallas_por_equipo")
          .select("id")
          .eq("equipo_id", data.equipo_id)
          .in("falla_id", fallaIds)

        const fallaEquipoIds = (fallaEquipos ?? []).map(f => f.id)
        if (fallaEquipoIds.length > 0) {
          const { data: repuestosSugeridos } = await supabase
            .from("taller_fallas_por_equipo_repuestos")
            .select("producto_id, cantidad")
            .in("falla_equipo_id", fallaEquipoIds)

          if (repuestosSugeridos?.length) {
            // Sumar cantidades por producto
            const acumulado = new Map<number, number>()
            for (const r of repuestosSugeridos) {
              const pid = Number(r.producto_id)
              if (!pid) continue
              acumulado.set(pid, (acumulado.get(pid) ?? 0) + Number(r.cantidad ?? 1))
            }

            const productoIds = [...acumulado.keys()]
            const { data: productos } = await supabase
              .from("productos")
              .select("id, nombre, costo_contable, costo_manual")
              .in("id", productoIds)

            // Si la OT tiene lista_precios_id, traemos los precios de la
            // versión activa más reciente de esa lista. Sobreescriben al
            // costo_contable del producto.
            const precioMap = new Map<number, number>()
            if (data.lista_precios_id) {
              const { data: version } = await supabase
                .from("versiones_lista_precios")
                .select("id")
                .eq("lista_precios_id", data.lista_precios_id)
                .eq("activa", true)
                .order("fecha_inicial", { ascending: false })
                .limit(1)
                .maybeSingle()
              if (version) {
                const { data: lineas } = await supabase
                  .from("version_lista_precios_lineas")
                  .select("producto_id, precio_venta")
                  .eq("version_id", version.id)
                  .in("producto_id", productoIds)
                for (const l of lineas ?? []) {
                  precioMap.set(Number(l.producto_id), Number(l.precio_venta ?? 0))
                }
              }
            }

            const prodMap = new Map<number, { nombre: string; precio: number }>()
            for (const p of productos ?? []) {
              const id = Number(p.id)
              const precio = precioMap.has(id)
                ? precioMap.get(id) ?? 0
                : Number(p.costo_contable ?? 0) || Number(p.costo_manual ?? 0) || 0
              prodMap.set(id, {
                nombre: p.nombre,
                precio,
              })
            }

            const repRows = [...acumulado.entries()].map(([pid, cant]) => {
              const info = prodMap.get(pid)
              const subtotal = (info?.precio ?? 0) * cant
              return {
                ot_id: data.id,
                producto_id: pid,
                producto_nombre: info?.nombre ?? `Producto #${pid}`,
                cantidad: cant,
                unidad: "un",
                precio_unitario: info?.precio ?? 0,
                descuento_pct: 0,
                subtotal,
                total: subtotal,
              }
            })
            if (repRows.length) {
              const { error: insErr } = await supabase
                .from("taller_ot_repuestos")
                .insert(repRows)
              if (insErr) {
                console.error(
                  "[ot create] auto-cargar repuestos falló al insertar:",
                  insErr.message,
                  "Filas que intentamos insertar:",
                  repRows,
                )
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[ot create] auto-cargar repuestos falló:", err)
    }
  }

  // Registrar historial
  if (data) {
    await supabase.from("taller_ot_historial").insert([{
      ot_id: data.id,
      usuario: body.usuario ?? "Sistema",
      estado_anterior: null,
      estado_nuevo: "borrador",
      nota: "OT creada",
    }])
    await registrarEvento(supabase, {
      tipo_documento: "orden_taller",
      documento_id: data.id,
      tipo_evento: "creacion",
      usuario: body.usuario ?? null,
      descripcion: `OT ${data.numero ?? `#${data.id}`}${body.cliente_nombre ? ` — ${body.cliente_nombre}` : ""}`,
    })
  }

  return NextResponse.json(data, { status: 201 })
}
