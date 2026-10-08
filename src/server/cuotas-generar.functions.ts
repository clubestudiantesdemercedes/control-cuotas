import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm'
import { requireUser } from './auth.server'

function primerDia(periodo: string) {
  const m = periodo.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  return `${m[1]}-${m[2]}-01`
}

function diaVencimiento(periodo: string) {
  const m = periodo.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  return `${m[1]}-${m[2]}-15`
}

function nombreMes(periodo: string) {
  const m = periodo.match(/^(\d{4})-(\d{2})$/)
  if (!m) return periodo
  const nombres = [
    '',
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]
  return `${nombres[Number(m[2])]} ${m[1]}`
}

function claveCuota(
  personId: number,
  tipo: string,
  disciplinaId: number | null,
) {
  return `${personId}|${tipo}|${disciplinaId ?? 'null'}`
}

async function buscarMonto(params: {
  db: any
  tarifario: any
  tipoCuota: 'social' | 'deportiva'
  clave: string
  periodo: string
}) {
  const dia = primerDia(params.periodo)
  if (!dia) return null

  const rows = await params.db
    .select()
    .from(params.tarifario)
    .where(
      and(
        eq(params.tarifario.tipoCuota, params.tipoCuota),
        eq(params.tarifario.tipoSocioSocial, params.clave),
        lte(params.tarifario.vigenciaDesde, dia),
        or(
          isNull(params.tarifario.vigenciaHasta),
          sql`${params.tarifario.vigenciaHasta} >= ${dia}`,
        ),
      ),
    )
    .orderBy(sql`${params.tarifario.vigenciaDesde} desc`)
    .limit(1)

  const row = rows[0]
  if (!row) return null
  return { monto: String(row.monto), tarifarioId: row.id as number }
}

async function loadSocios(db: any, schema: any, personId?: number) {
  const {
    people,
    memberships,
    inscripcionesDeportivas,
    disciplinas,
    categoriasDeportivas,
  } = schema

  const base = db
    .select({
      personId: people.id,
      dni: people.documentNumber,
      firstName: people.firstName,
      lastName: people.lastName,
      beca: people.beca,
      tieneDebitoAutomatico: people.tieneDebitoAutomatico,
      membershipId: memberships.id,
      memberNumber: memberships.memberNumber,
      category: memberships.category,
      subcategoriaCuota: memberships.subcategoriaCuota,
      inscId: inscripcionesDeportivas.id,
      disciplinaId: inscripcionesDeportivas.disciplinaId,
      categoriaDeportivaId: inscripcionesDeportivas.categoriaDeportivaId,
      subcategoriaCuotaDeporte: inscripcionesDeportivas.subcategoriaCuota,
      deporte: disciplinas.nombre,
      categoriaDeportivaNombre: categoriasDeportivas.nombre,
    })
    .from(people)
    .innerJoin(
      memberships,
      and(
        eq(memberships.personId, people.id),
        eq(memberships.status, 'activo'),
        isNull(memberships.endDate),
      ),
    )
    .leftJoin(
      inscripcionesDeportivas,
      and(
        eq(inscripcionesDeportivas.personId, people.id),
        eq(inscripcionesDeportivas.activa, true),
      ),
    )
    .leftJoin(
      disciplinas,
      eq(inscripcionesDeportivas.disciplinaId, disciplinas.id),
    )
    .leftJoin(
      categoriasDeportivas,
      eq(
        inscripcionesDeportivas.categoriaDeportivaId,
        categoriasDeportivas.id,
      ),
    )

  if (personId != null) {
    return base.where(eq(people.id, personId))
  }
  return base
}

type ItemPlan = {
  personId: number
  dni: string
  nombreCompleto: string
  nroSocio: string | null
  tipoCuota: 'social' | 'deportiva'
  subcategoriaCuota: string
  disciplinaId: number | null
  disciplinaNombre: string | null
  categoriaDeportivaId: number | null
  categoriaDeportivaNombre: string | null
  membershipId: number | null
  montoOriginal: string
  montoFinal: string
  tarifarioId: number
  estado: 'pendiente' | 'pagada'
  concepto: string
  cuotaExistenteId: number | null
  tieneDebito: boolean
}

async function planificar(params: {
  periodo: string
  personId?: number
  categoriasSociales?: string[]
  categoriasDeportivasIds?: number[]
  modoIndividual: boolean
}) {
  const { db } = await import('../../db')
  const schema = await import('../../db/schema')
  const { cuotasGeneradas, tarifario } = schema

  const periodo = params.periodo
  const venc = diaVencimiento(periodo)
  if (!venc || !primerDia(periodo)) {
    return { ok: false as const, error: 'Período inválido (YYYY-MM)' }
  }

  const socios = await loadSocios(db, schema, params.personId)
  if (params.personId != null && socios.length === 0) {
    return {
      ok: false as const,
      error: 'Persona sin membresía activa',
    }
  }

  const existentes = params.personId
    ? await db
        .select()
        .from(cuotasGeneradas)
        .where(
          and(
            eq(cuotasGeneradas.periodo, periodo),
            eq(cuotasGeneradas.personId, params.personId),
          ),
        )
    : await db
        .select()
        .from(cuotasGeneradas)
        .where(eq(cuotasGeneradas.periodo, periodo))

  // Solo pendientes/pagadas bloquean; las anuladas son historial
  const mapExist = new Map<string, (typeof existentes)[0]>()
  for (const e of existentes) {
    if (e.estado === 'anulada') continue
    mapExist.set(
      claveCuota(e.personId, e.tipoCuota, e.disciplinaId ?? null),
      e,
    )
  }

  const selSocial = new Set(params.categoriasSociales || [])
  const selDep = new Set(params.categoriasDeportivasIds || [])
  const items: ItemPlan[] = []
  const errores: string[] = []

  for (const s of socios) {
    const nombreCompleto = `${s.lastName}, ${s.firstName}`
    const esVitalicio = s.category === 'vitalicio'
    const tieneDeporte =
      s.inscId != null &&
      s.disciplinaId != null &&
      s.categoriaDeportivaId != null

    let tipo: 'social' | 'deportiva'
    let clave: string
    let discId: number | null = null
    let catDepId: number | null = null
    let discNombre: string | null = null
    let catDepNombre: string | null = null
    let concepto: string

    if (tieneDeporte && !esVitalicio) {
      if (!params.modoIndividual && !selDep.has(s.categoriaDeportivaId!)) {
        continue
      }
      tipo = 'deportiva'
      clave =
        s.subcategoriaCuotaDeporte === '2_hermano'
          ? '2_hermano'
          : s.subcategoriaCuotaDeporte === '3_hermano'
            ? '3_hermano'
            : 'deportista_pleno'
      discId = s.disciplinaId
      catDepId = s.categoriaDeportivaId
      discNombre = s.deporte
      catDepNombre = s.categoriaDeportivaNombre
      concepto = `Cuota deportiva ${s.deporte} ${nombreMes(periodo)}`
    } else {
      if (esVitalicio) clave = 'vitalicio'
      else if (
        s.subcategoriaCuota === '3_familiar' ||
        s.subcategoriaCuota === '4_familiar'
      ) {
        clave = s.subcategoriaCuota
      } else {
        clave = s.category || 'activo'
      }
      if (!params.modoIndividual && !selSocial.has(clave)) continue
      tipo = 'social'
      concepto = `Cuota social ${nombreMes(periodo)}`
    }

    const tarifa = await buscarMonto({
      db,
      tarifario,
      tipoCuota: tipo,
      clave,
      periodo,
    })
    if (!tarifa) {
      errores.push(`${nombreCompleto}: sin tarifa ${tipo}/${clave}`)
      continue
    }

    let montoOriginal = Number(tarifa.monto)
    let montoFinal = montoOriginal
    let estado: 'pendiente' | 'pagada' = 'pendiente'
    const tieneDebito = !!s.tieneDebitoAutomatico

    if (s.beca || montoOriginal === 0) {
      montoFinal = 0
      estado = 'pagada'
    } else if (tieneDebito) {
      montoFinal = Math.round(montoOriginal * 0.9 * 100) / 100
      concepto = `${concepto} (débito -10%)`
    }

    const k = claveCuota(s.personId, tipo, discId)
    const prev = mapExist.get(k)

    items.push({
      personId: s.personId,
      dni: s.dni,
      nombreCompleto,
      nroSocio: s.memberNumber,
      tipoCuota: tipo,
      subcategoriaCuota: clave,
      disciplinaId: discId,
      disciplinaNombre: discNombre,
      categoriaDeportivaId: catDepId,
      categoriaDeportivaNombre: catDepNombre,
      membershipId: s.membershipId,
      montoOriginal: montoOriginal.toFixed(2),
      montoFinal: montoFinal.toFixed(2),
      tarifarioId: tarifa.tarifarioId,
      estado,
      concepto,
      cuotaExistenteId: prev && prev.estado === 'pendiente' ? prev.id : null,
      tieneDebito,
    })
  }

  return {
    ok: true as const,
    periodo,
    vencimiento: venc,
    items,
    errores,
  }
}

export const datosParaGenerar = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const { db } = await import('../../db')
    const { disciplinas, categoriasDeportivas } = await import(
      '../../db/schema'
    )

    const discs = await db
      .select()
      .from(disciplinas)
      .where(eq(disciplinas.activa, true))
      .orderBy(asc(disciplinas.nombre))

    const cats = await db
      .select()
      .from(categoriasDeportivas)
      .where(eq(categoriasDeportivas.activa, true))
      .orderBy(asc(categoriasDeportivas.nombre))

    return { ok: true as const, disciplinas: discs, categorias: cats }
  },
)

export const previsualizarGeneracion = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      periodo: string
      categoriasSociales: string[]
      categoriasDeportivasIds: number[]
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const plan = await planificar({
      periodo: data.periodo,
      categoriasSociales: data.categoriasSociales,
      categoriasDeportivasIds: data.categoriasDeportivasIds,
      modoIndividual: false,
    })
    if (!plan.ok) return plan

    const aGenerar = plan.items.filter((i) => i.cuotaExistenteId == null)
    const omitidas = plan.items.filter((i) => i.cuotaExistenteId != null)

    const resumenMap = new Map<
      string,
      { label: string; personas: number; total: number }
    >()
    for (const i of aGenerar) {
      const label =
        i.tipoCuota === 'deportiva'
          ? `${i.disciplinaNombre} · ${i.categoriaDeportivaNombre} · ${i.subcategoriaCuota}`
          : `Social · ${i.subcategoriaCuota}`
      const prev = resumenMap.get(label) || {
        label,
        personas: 0,
        total: 0,
      }
      prev.personas += 1
      prev.total += Number(i.montoFinal)
      resumenMap.set(label, prev)
    }

    return {
      ok: true as const,
      modo: 'preview' as const,
      periodo: plan.periodo,
      totalAGenerar: aGenerar.length,
      omitidas: omitidas.length,
      totalMonto: aGenerar.reduce((a, i) => a + Number(i.montoFinal), 0),
      resumen: [...resumenMap.values()],
      errores: plan.errores,
    }
  })

export const confirmarGeneracion = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      periodo: string
      categoriasSociales: string[]
      categoriasDeportivasIds: number[]
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cuotasGeneradas, generacionesCuotas } = await import(
      '../../db/schema'
    )

    const plan = await planificar({
      periodo: data.periodo,
      categoriasSociales: data.categoriasSociales,
      categoriasDeportivasIds: data.categoriasDeportivasIds,
      modoIndividual: false,
    })
    if (!plan.ok) return plan

    let creadas = 0
    let omitidas = 0
    const errores = [...plan.errores]
    let totalMonto = 0

    for (const i of plan.items) {
      if (i.cuotaExistenteId != null) {
        omitidas++
        continue
      }
      try {
        await db.insert(cuotasGeneradas).values({
          personId: i.personId,
          membershipId: i.membershipId,
          tipoCuota: i.tipoCuota,
          disciplinaId: i.disciplinaId,
          categoriaDeportivaId: i.categoriaDeportivaId,
          periodo: plan.periodo,
          concepto: i.concepto,
          montoOriginal: i.montoOriginal,
          montoFinal: i.montoFinal,
          fechaVencimiento: plan.vencimiento,
          estado: i.estado,
          dni: i.dni,
          nombreCompleto: i.nombreCompleto,
          nroSocio: i.nroSocio,
          subcategoriaCuota: i.subcategoriaCuota,
          disciplinaNombre: i.disciplinaNombre,
          categoriaDeportivaNombre: i.categoriaDeportivaNombre,
          tarifarioId: i.tarifarioId,
        })
        creadas++
        totalMonto += Number(i.montoFinal)
      } catch (err: any) {
        const msg = String(err?.message || err)
        if (msg.includes('unique') || msg.includes('duplicate')) {
          omitidas++
          errores.push(
            `${i.nombreCompleto}: ya existe cuota vigente (unique). Revisá índice parcial si hay anuladas.`,
          )
        } else {
          console.error(err)
          errores.push(`${i.nombreCompleto}: error al insertar`)
        }
      }
    }

    await db.insert(generacionesCuotas).values({
      periodo: plan.periodo,
      cantidadPersonas: creadas,
      cantidadCuotas: creadas,
      cantidadErrores: errores.length,
      modo: 'masiva',
      log: { omitidas, errores },
    })

    return {
      ok: true as const,
      modo: 'confirmado' as const,
      periodo: plan.periodo,
      creadas,
      omitidas,
      errores,
      totalMonto,
    }
  })

export const previsualizarGeneracionIndividual = createServerFn({
  method: 'POST',
})
  .inputValidator(
    (data: {
      periodo: string
      busqueda: string
      tipo: 'dni' | 'socio'
      reemplazarSiExiste?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { people, memberships } = await import('../../db/schema')

    const valor = data.busqueda.trim()
    if (!valor) {
      return { ok: false as const, error: 'Ingresá DNI o n° socio' }
    }

    let personId: number | null = null

    if (data.tipo === 'dni') {
      const dni = valor.replace(/\D/g, '') || valor
      const [p] = await db
        .select()
        .from(people)
        .where(eq(people.documentNumber, dni))
        .limit(1)
      personId = p?.id ?? null
    } else {
      const [m] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.memberNumber, valor),
            eq(memberships.status, 'activo'),
            isNull(memberships.endDate),
          ),
        )
        .limit(1)
      personId = m?.personId ?? null
    }

    if (!personId) {
      return { ok: false as const, error: 'Persona no encontrada' }
    }

    const plan = await planificar({
      periodo: data.periodo,
      personId,
      modoIndividual: true,
    })
    if (!plan.ok) return plan

    const aReemplazar = plan.items.filter((i) => i.cuotaExistenteId != null)

    return {
      ok: true as const,
      modo: 'preview_individual' as const,
      periodo: plan.periodo,
      personId,
      items: plan.items,
      aReemplazar: aReemplazar.length,
      errores: plan.errores,
      totalMonto: plan.items.reduce((a, i) => a + Number(i.montoFinal), 0),
    }
  })

export const confirmarGeneracionIndividual = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      periodo: string
      personId: number
      reemplazarSiExiste: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cuotasGeneradas, generacionesCuotas } = await import(
      '../../db/schema'
    )

    const plan = await planificar({
      periodo: data.periodo,
      personId: data.personId,
      modoIndividual: true,
    })
    if (!plan.ok) return plan

    let anuladas = 0
    let creadas = 0
    const errores = [...plan.errores]

    for (const i of plan.items) {
      // 1) Si hay pendiente y se pidió reemplazo → anular (queda historial con motivo)
      if (i.cuotaExistenteId) {
        if (!data.reemplazarSiExiste) {
          errores.push(
            `${i.nombreCompleto}: ya tiene cuota pendiente (no se reemplazó)`,
          )
          continue
        }

        const [exist] = await db
          .select()
          .from(cuotasGeneradas)
          .where(eq(cuotasGeneradas.id, i.cuotaExistenteId))
          .limit(1)

        if (exist?.estado === 'pagada' && Number(exist.montoFinal) > 0) {
          errores.push(
            `${i.nombreCompleto}: cuota pagada, no se puede reemplazar`,
          )
          continue
        }

        if (exist && exist.estado === 'pendiente') {
          await db
            .update(cuotasGeneradas)
            .set({
              estado: 'anulada',
              concepto:
                `${exist.concepto || i.concepto} · ANULADA: reemplazo generación individual`.slice(
                  0,
                  500,
                ),
            })
            .where(eq(cuotasGeneradas.id, i.cuotaExistenteId))
          anuladas++
        }
      }

      // 2) Siempre INSERT de la nueva (las anuladas previas no se reutilizan)
      try {
        await db.insert(cuotasGeneradas).values({
          personId: i.personId,
          membershipId: i.membershipId,
          tipoCuota: i.tipoCuota,
          disciplinaId: i.disciplinaId,
          categoriaDeportivaId: i.categoriaDeportivaId,
          periodo: plan.periodo,
          concepto: i.concepto,
          montoOriginal: i.montoOriginal,
          montoFinal: i.montoFinal,
          fechaVencimiento: plan.vencimiento,
          estado: i.estado,
          dni: i.dni,
          nombreCompleto: i.nombreCompleto,
          nroSocio: i.nroSocio,
          subcategoriaCuota: i.subcategoriaCuota,
          disciplinaNombre: i.disciplinaNombre,
          categoriaDeportivaNombre: i.categoriaDeportivaNombre,
          tarifarioId: i.tarifarioId,
        })
        creadas++
      } catch (err: any) {
        console.error(err)
        const msg = String(err?.message || err)
        errores.push(
          `${i.nombreCompleto}: error al insertar (${msg.slice(0, 150)})`,
        )
      }
    }

    await db.insert(generacionesCuotas).values({
      periodo: plan.periodo,
      cantidadPersonas: 1,
      cantidadCuotas: creadas,
      cantidadErrores: errores.length,
      modo: 'individual',
      log: { anuladas, personId: data.personId, errores },
    })

    return {
      ok: true as const,
      creadas,
      anuladas,
      errores,
    }
  })