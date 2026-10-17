import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import { requireUser } from './auth.server'
import { estadoCuotaVisual } from '../lib/estado-cuota'

export const listarPeriodosConCuotas = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const { db } = await import('../../db')
    const { cuotasGeneradas } = await import('../../db/schema')

    const rows = await db
      .select({
        periodo: cuotasGeneradas.periodo,
        cantidad: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${cuotasGeneradas.montoFinal}::numeric), 0)`,
        pendientes: sql<number>`count(*) filter (where ${cuotasGeneradas.estado} = 'pendiente')::int`,
        pagadas: sql<number>`count(*) filter (where ${cuotasGeneradas.estado} = 'pagada')::int`,
        anuladas: sql<number>`count(*) filter (where ${cuotasGeneradas.estado} = 'anulada')::int`,
      })
      .from(cuotasGeneradas)
      .groupBy(cuotasGeneradas.periodo)
      .orderBy(desc(cuotasGeneradas.periodo))

    return { ok: true as const, periodos: rows }
  },
)

export const listarCuotasPorPeriodo = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      periodo: string
      estado?: 'todas' | 'pendiente' | 'pagada' | 'anulada'
      q?: string
      /** undefined = todos; null = sin cobrador; number = ese cobrador */
      cobradorId?: number | null
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cuotasGeneradas, people, cobradores } = await import(
      '../../db/schema'
    )

    const periodo = data.periodo.trim()
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return { ok: false as const, error: 'Período inválido (YYYY-MM)' }
    }

    const conditions = [eq(cuotasGeneradas.periodo, periodo)]
    if (data.estado && data.estado !== 'todas') {
      conditions.push(eq(cuotasGeneradas.estado, data.estado))
    }
    if (data.cobradorId === null) {
      conditions.push(isNull(people.cobradorId))
    } else if (typeof data.cobradorId === 'number') {
      conditions.push(eq(people.cobradorId, data.cobradorId))
    }

    let rows = await db
      .select({
        id: cuotasGeneradas.id,
        personId: cuotasGeneradas.personId,
        membershipId: cuotasGeneradas.membershipId,
        tipoCuota: cuotasGeneradas.tipoCuota,
        disciplinaId: cuotasGeneradas.disciplinaId,
        categoriaDeportivaId: cuotasGeneradas.categoriaDeportivaId,
        periodo: cuotasGeneradas.periodo,
        concepto: cuotasGeneradas.concepto,
        montoOriginal: cuotasGeneradas.montoOriginal,
        montoFinal: cuotasGeneradas.montoFinal,
        fechaVencimiento: cuotasGeneradas.fechaVencimiento,
        estado: cuotasGeneradas.estado,
        generadaEn: cuotasGeneradas.generadaEn,
        dni: cuotasGeneradas.dni,
        nombreCompleto: cuotasGeneradas.nombreCompleto,
        nroSocio: cuotasGeneradas.nroSocio,
        subcategoriaCuota: cuotasGeneradas.subcategoriaCuota,
        disciplinaNombre: cuotasGeneradas.disciplinaNombre,
        categoriaDeportivaNombre: cuotasGeneradas.categoriaDeportivaNombre,
        tarifarioId: cuotasGeneradas.tarifarioId,
        cobradorId: people.cobradorId,
        cobradorNombre: cobradores.nombre,
      })
      .from(cuotasGeneradas)
      .innerJoin(people, eq(cuotasGeneradas.personId, people.id))
      .leftJoin(cobradores, eq(people.cobradorId, cobradores.id))
      .where(and(...conditions))
      .orderBy(
        asc(cuotasGeneradas.nombreCompleto),
        asc(cuotasGeneradas.tipoCuota),
      )
      .limit(5000)

    const q = data.q?.trim().toLowerCase()
    if (q) {
      const digits = q.replace(/\D/g, '')
      rows = rows.filter((r) => {
        if (digits && String(r.dni || '').includes(digits)) return true
        if (digits && String(r.nroSocio || '').includes(digits)) return true
        if (String(r.nombreCompleto || '').toLowerCase().includes(q)) {
          return true
        }
        if (String(r.concepto || '').toLowerCase().includes(q)) return true
        if (String(r.cobradorNombre || '').toLowerCase().includes(q)) {
          return true
        }
        return false
      })
    }

    const cuotas = rows.map((r) => {
      const visual = estadoCuotaVisual({
        estado: r.estado,
        fechaVencimiento: r.fechaVencimiento,
      })
      return {
        ...r,
        estadoVisual: visual.codigo,
        estadoLabel: visual.label,
      }
    })

    const total = cuotas.reduce((acc, r) => acc + Number(r.montoFinal), 0)
    const pendientes = cuotas.filter((r) => r.estado === 'pendiente')
    const totalPendiente = pendientes.reduce(
      (acc, r) => acc + Number(r.montoFinal),
      0,
    )
    const vencidas = cuotas.filter((r) => r.estadoVisual === 'vencida').length
    const enMora = cuotas.filter((r) => r.estadoVisual === 'mora').length

    return {
      ok: true as const,
      periodo,
      cuotas,
      resumen: {
        cantidad: cuotas.length,
        total,
        pendientes: pendientes.length,
        totalPendiente,
        vencidas,
        enMora,
      },
    }
  })