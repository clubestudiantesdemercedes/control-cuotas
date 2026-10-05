import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { requireUser } from './auth.server'

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
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cuotasGeneradas } = await import('../../db/schema')

    const periodo = data.periodo.trim()
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return { ok: false as const, error: 'Período inválido (YYYY-MM)' }
    }

    const conditions = [eq(cuotasGeneradas.periodo, periodo)]
    if (data.estado && data.estado !== 'todas') {
      conditions.push(eq(cuotasGeneradas.estado, data.estado))
    }

    let rows = await db
      .select()
      .from(cuotasGeneradas)
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
        return false
      })
    }

    const total = rows.reduce((acc, r) => acc + Number(r.montoFinal), 0)
    const pendientes = rows.filter((r) => r.estado === 'pendiente')
    const totalPendiente = pendientes.reduce(
      (acc, r) => acc + Number(r.montoFinal),
      0,
    )

    return {
      ok: true as const,
      periodo,
      cuotas: rows,
      resumen: {
        cantidad: rows.length,
        total,
        pendientes: pendientes.length,
        totalPendiente,
      },
    }
  })