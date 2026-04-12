import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/taller/asignador
// Body: { tecnico_ids: string[], tope_por_tecnico: number, usuario: string }
export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  const tecnicoIds: string[] = body.tecnico_ids ?? []
  const tope: number = body.tope_por_tecnico ?? 4
  const usuario: string = body.usuario ?? "Sistema"

  // 1. Pool de OTs sin asignar, ordenadas según algoritmo
  const { data: ots, error: otsErr } = await supabase
    .from("taller_ordenes_trabajo")
    .select("*, taller_ot_fallas_secundarias(falla_id)")
    .eq("estado", "sin_asignar")
    .order("fecha_creacion", { ascending: true })

  if (otsErr) return NextResponse.json({ error: otsErr.message }, { status: 500 })
  if (!ots?.length) return NextResponse.json({ asignadas: 0, detalle: [] })

  // Ordenar: público antes que mayorista, luego fecha asc (ya viene), luego complejidad
  const otPool = [...ots].sort((a, b) => {
    const catOrder = (c: string) => c === "publico" ? 0 : 1
    const diff = catOrder(a.categoria_cliente) - catOrder(b.categoria_cliente)
    if (diff !== 0) return diff
    return 0 // fecha ya está ordenada
  })

  // 2. Obtener técnicos habilitados con sus categorías
  const { data: tecnicos } = await supabase
    .from("taller_tecnicos")
    .select("*, taller_tecnico_categorias_secundarias(categoria_id)")
    .eq("activo", true)
    .in("id", tecnicoIds)

  if (!tecnicos?.length) return NextResponse.json({ asignadas: 0, detalle: [] })

  // Contar OTs ya asignadas por técnico (ASIGNADA + EN PROCESO)
  const { data: asignadas } = await supabase
    .from("taller_ordenes_trabajo")
    .select("tecnico_id, tiempo_reparacion_teorico")
    .in("estado", ["asignada", "asignada_en_proceso"])
    .in("tecnico_id", tecnicoIds)

  const countByTec: Record<string, number> = {}
  const tiempoByTec: Record<string, number> = {}
  for (const a of asignadas ?? []) {
    countByTec[a.tecnico_id] = (countByTec[a.tecnico_id] ?? 0) + 1
    tiempoByTec[a.tecnico_id] = (tiempoByTec[a.tecnico_id] ?? 0) + (a.tiempo_reparacion_teorico ?? 0)
  }

  // Obtener complejidad de fallas
  const { data: fallasEquipo } = await supabase
    .from("taller_fallas_por_equipo")
    .select("equipo_id, falla_id, complejidad_principal, complejidad_secundaria")

  const feMap: Record<string, { cp: number; cs: number }> = {}
  for (const fe of fallasEquipo ?? []) {
    feMap[`${fe.equipo_id}-${fe.falla_id}`] = {
      cp: fe.complejidad_principal,
      cs: fe.complejidad_secundaria,
    }
  }

  const resultados: { ot_id: string; ot_numero: string; tecnico_id: string; tecnico_nombre: string }[] = []

  for (const ot of otPool) {
    // Calcular complejidad total
    const fpKey = `${ot.equipo_id}-${ot.falla_principal_id}`
    let complejidadTotal = feMap[fpKey]?.cp ?? 1
    for (const fs of ot.taller_ot_fallas_secundarias ?? []) {
      const fsKey = `${ot.equipo_id}-${fs.falla_id}`
      complejidadTotal += feMap[fsKey]?.cs ?? 1
    }

    // Buscar técnico: primero por categoría principal
    const candidatos = tecnicos
      .filter(t =>
        t.categoria_principal_id === ot.categoria_reparacion_id &&
        (t.complejidad_tope ?? 999) >= complejidadTotal &&
        (countByTec[t.id] ?? 0) < tope
      )
      .sort((a, b) => {
        const ta = tiempoByTec[a.id] ?? 0
        const tb = tiempoByTec[b.id] ?? 0
        if (ta !== tb) return ta - tb
        return a.nombre.localeCompare(b.nombre)
      })

    let elegido = candidatos[0] ?? null

    // Si no hay por principal, buscar por secundarias
    if (!elegido) {
      const candidatosSec = tecnicos
        .filter(t => {
          const secIds = (t.taller_tecnico_categorias_secundarias ?? []).map((s: { categoria_id: string }) => s.categoria_id)
          return secIds.includes(ot.categoria_reparacion_id) &&
            (t.complejidad_tope ?? 999) >= complejidadTotal &&
            (countByTec[t.id] ?? 0) < tope
        })
        .sort((a, b) => {
          const ta = tiempoByTec[a.id] ?? 0
          const tb = tiempoByTec[b.id] ?? 0
          if (ta !== tb) return ta - tb
          return a.nombre.localeCompare(b.nombre)
        })

      elegido = candidatosSec[0] ?? null
    }

    if (elegido) {
      // Asignar
      await supabase
        .from("taller_ordenes_trabajo")
        .update({
          estado: "asignada",
          tecnico_id: elegido.id,
          fecha_asignacion: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ot.id)

      await supabase.from("taller_ot_historial").insert([{
        ot_id: ot.id,
        usuario,
        estado_anterior: "sin_asignar",
        estado_nuevo: "asignada",
        nota: `Asignación automática a ${elegido.nombre}`,
      }])

      countByTec[elegido.id] = (countByTec[elegido.id] ?? 0) + 1
      tiempoByTec[elegido.id] = (tiempoByTec[elegido.id] ?? 0) + (ot.tiempo_reparacion_teorico ?? 0)

      resultados.push({
        ot_id: ot.id,
        ot_numero: ot.numero,
        tecnico_id: elegido.id,
        tecnico_nombre: elegido.nombre,
      })
    }
  }

  return NextResponse.json({ asignadas: resultados.length, detalle: resultados })
}
