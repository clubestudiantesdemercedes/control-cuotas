import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
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

function mesNumero(periodo: string) {
  const m = periodo.match(/^(\d{4})-(\d{2})$/)
  return m ? Number(m[2]) : 0
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

export const datosParaGenerar = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const { db } = await import('../../db')
    const { disciplinas, categoriasDeportivas } = await import('../../db/schema')

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

    return {
      ok: true as const,
      disciplinas: discs,
      categorias: cats,
      categoriasSociales: [
        'menor',
        'cadete',
        'activo',
        'vitalicio',
        '3_familiar',
        '4_familiar',
      ],
    }
  },
)

type PreviewItem = {
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
  monto: string
  tarifarioId: number | null
  estado: 'pendiente' | 'pagada'
  concepto: string
  yaExiste: boolean
  beca: boolean
}

async function armarPlan(params: {
  periodo: string
  categoriasSociales: string[]
  categoriasDeportivasIds: number[]
  confirmar: boolean
}) {
  const { db } = await import('../../db')
  const {
    people,
    memberships,
    inscripcionesDeportivas,
    disciplinas,
    categoriasDeportivas,
    tarifario,
    cuotasGeneradas,
    generacionesCuotas,
  } = await import('../../db/schema')

  const periodo = params.periodo
  const venc = diaVencimiento(periodo)
  if (!venc || !primerDia(periodo)) {
    return { ok: false as const, error: 'Período inválido (YYYY-MM)' }
  }

  const socios = await db
    .select({
      personId: people.id,
      dni: people.documentNumber,
      firstName: people.firstName,
      lastName: people.lastName,
      beca: people.beca,
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

  const existentes = await db
    .select({
      personId: cuotasGeneradas.personId,
      tipoCuota: cuotasGeneradas.tipoCuota,
      disciplinaId: cuotasGeneradas.disciplinaId,
      estado: cuotasGeneradas.estado,
    })
    .from(cuotasGeneradas)
    .where(
      and(
        eq(cuotasGeneradas.periodo, periodo),
        // no contar anuladas como bloqueo absoluto: unique incluye no anuladas normalmente
      ),
    )

  const keyExist = new Set(
    existentes
      .filter((e) => e.estado !== 'anulada')
      .map(
        (e) =>
          `${e.personId}|${e.tipoCuota}|${e.disciplinaId ?? 'null'}`,
      ),
  )

  const items: PreviewItem[] = []
  const errores: string[] = []
  const selSocial = new Set(params.categoriasSociales)
  const selDep = new Set(params.categoriasDeportivasIds)

  for (const s of socios) {
    const nombreCompleto = `${s.lastName}, ${s.firstName}`
    const esVitalicio = s.category === 'vitalicio'
    const tieneDeporte =
      s.inscId != null &&
      s.disciplinaId != null &&
      s.categoriaDeportivaId != null

    // --- Deportiva ---
    if (tieneDeporte && !esVitalicio) {
      if (!selDep.has(s.categoriaDeportivaId!)) {
        // Deportista cuya categoría no se genera este mes → no social
        continue
      }

      const claveDep =
        s.subcategoriaCuotaDeporte === '2_hermano'
          ? '2_hermano'
          : s.subcategoriaCuotaDeporte === '3_hermano'
            ? '3_hermano'
            : 'deportista_pleno'

      const tarifa = await buscarMonto({
        db,
        tarifario,
        tipoCuota: 'deportiva',
        clave: claveDep,
        periodo,
      })
      if (!tarifa) {
        errores.push(
          `${nombreCompleto}: sin tarifa deportiva ${claveDep}`,
        )
        continue
      }

      let monto = tarifa.monto
      let estado: 'pendiente' | 'pagada' = 'pendiente'
      if (s.beca || Number(monto) === 0) {
        monto = '0'
        estado = 'pagada'
      }

      const k = `${s.personId}|deportiva|${s.disciplinaId}`
      items.push({
        personId: s.personId,
        dni: s.dni,
        nombreCompleto,
        nroSocio: s.memberNumber,
        tipoCuota: 'deportiva',
        subcategoriaCuota: claveDep,
        disciplinaId: s.disciplinaId,
        disciplinaNombre: s.deporte,
        categoriaDeportivaId: s.categoriaDeportivaId,
        categoriaDeportivaNombre: s.categoriaDeportivaNombre,
        membershipId: s.membershipId,
        monto,
        tarifarioId: tarifa.tarifarioId,
        estado,
        concepto: `Cuota deportiva ${s.deporte} ${nombreMes(periodo)}`,
        yaExiste: keyExist.has(k),
        beca: !!s.beca,
      })
      continue
    }

    // --- Social ---
    let claveSocial: string
    if (esVitalicio) {
      claveSocial = 'vitalicio'
    } else if (
      s.subcategoriaCuota === '3_familiar' ||
      s.subcategoriaCuota === '4_familiar'
    ) {
      claveSocial = s.subcategoriaCuota
    } else {
      claveSocial = s.category || 'activo'
    }

    if (!selSocial.has(claveSocial) && !selSocial.has(s.category || '')) {
      // permitir tildar menor/cadete/activo o 3_familiar
      if (!selSocial.has(claveSocial)) continue
    }
    if (!selSocial.has(claveSocial)) continue

    const tarifa = await buscarMonto({
      db,
      tarifario,
      tipoCuota: 'social',
      clave: claveSocial,
      periodo,
    })
    if (!tarifa) {
      errores.push(`${nombreCompleto}: sin tarifa social ${claveSocial}`)
      continue
    }

    let monto = tarifa.monto
    let estado: 'pendiente' | 'pagada' = 'pendiente'
    if (s.beca || Number(monto) === 0) {
      monto = '0'
      estado = 'pagada'
    }

    const k = `${s.personId}|social|null`
    items.push({
      personId: s.personId,
      dni: s.dni,
      nombreCompleto,
      nroSocio: s.memberNumber,
      tipoCuota: 'social',
      subcategoriaCuota: claveSocial,
      disciplinaId: null,
      disciplinaNombre: null,
      categoriaDeportivaId: null,
      categoriaDeportivaNombre: null,
      membershipId: s.membershipId,
      monto,
      tarifarioId: tarifa.tarifarioId,
      estado,
      concepto: `Cuota social ${nombreMes(periodo)}`,
      yaExiste: keyExist.has(k),
      beca: !!s.beca,
    })
  }

  const aGenerar = items.filter((i) => !i.yaExiste)
  const omitidas = items.filter((i) => i.yaExiste)

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
    prev.total += Number(i.monto)
    resumenMap.set(label, prev)
  }

  const resumen = [...resumenMap.values()]
  const totalMonto = aGenerar.reduce((acc, i) => acc + Number(i.monto), 0)

  if (params.confirmar) {
    let creadas = 0
    for (const i of aGenerar) {
      try {
        await db.insert(cuotasGeneradas).values({
          personId: i.personId,
          membershipId: i.membershipId,
          tipoCuota: i.tipoCuota,
          disciplinaId: i.disciplinaId,
          categoriaDeportivaId: i.categoriaDeportivaId,
          periodo,
          concepto: i.concepto,
          montoOriginal: i.monto,
          montoFinal: i.monto,
          fechaVencimiento: venc,
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
        if (
          String(err?.message || err).includes('unique') ||
          String(err).includes('duplicate')
        ) {
          // ya existía
        } else {
          console.error(err)
          errores.push(`${i.nombreCompleto}: error al insertar`)
        }
      }
    }

    await db.insert(generacionesCuotas).values({
      periodo,
      cantidadPersonas: aGenerar.length,
      cantidadCuotas: creadas,
      cantidadErrores: errores.length,
      modo: 'masiva',
      log: { resumen, omitidas: omitidas.length, errores },
    })

    return {
      ok: true as const,
      modo: 'confirmado' as const,
      periodo,
      creadas,
      omitidas: omitidas.length,
      errores,
      resumen,
      totalMonto,
    }
  }

  return {
    ok: true as const,
    modo: 'preview' as const,
    periodo,
    items: aGenerar.slice(0, 50),
    totalAGenerar: aGenerar.length,
    omitidas: omitidas.length,
    errores,
    resumen,
    totalMonto,
  }
}

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
    return armarPlan({ ...data, confirmar: false })
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
    return armarPlan({ ...data, confirmar: true })
  })