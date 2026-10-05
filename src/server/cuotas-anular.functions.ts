import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNull } from 'drizzle-orm'
import { requireUser } from './auth.server'

export const MOTIVOS_ANULACION = [
  { codigo: 'baja_socio', label: 'Baja de socio / no corresponde cuota' },
  { codigo: 'error_generacion', label: 'Error en la generación' },
  { codigo: 'cambio_situacion', label: 'Cambio de categoría / deporte' },
  { codigo: 'tarifario', label: 'Tarifario incorrecto o desactualizado' },
  { codigo: 'duplicada', label: 'Cuota duplicada' },
  { codigo: 'otro', label: 'Otro' },
] as const

function armarTextoMotivo(codigo: string, observacion: string) {
  const meta = MOTIVOS_ANULACION.find((m) => m.codigo === codigo)
  const label = meta?.label || codigo
  const obs = observacion.trim()
  return obs ? `${label}. ${obs}` : label
}

export const listarMotivosAnulacion = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    return { ok: true as const, motivos: MOTIVOS_ANULACION }
  },
)

export const anularCuota = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      cuotaId: number
      motivoCodigo: string
      observacion?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cuotasGeneradas } = await import('../../db/schema')

    const motivo = armarTextoMotivo(
      data.motivoCodigo,
      data.observacion || '',
    )
    if (motivo.length < 3) {
      return { ok: false as const, error: 'Indicá un motivo válido' }
    }

    const [cuota] = await db
      .select()
      .from(cuotasGeneradas)
      .where(eq(cuotasGeneradas.id, data.cuotaId))
      .limit(1)

    if (!cuota) return { ok: false as const, error: 'Cuota no encontrada' }
    if (cuota.estado === 'anulada') {
      return { ok: false as const, error: 'La cuota ya está anulada' }
    }
    if (cuota.estado === 'pagada') {
      return {
        ok: false as const,
        error: 'No se puede anular una cuota pagada',
      }
    }

    await db
      .update(cuotasGeneradas)
      .set({
        estado: 'anulada',
        concepto: `${cuota.concepto} · ANULADA: ${motivo}`.slice(0, 500),
      })
      .where(eq(cuotasGeneradas.id, data.cuotaId))

    return {
      ok: true as const,
      mensaje: 'Cuota anulada',
      cuotaId: data.cuotaId,
    }
  })

export const anularCuotasMasiva = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      periodo: string
      motivoCodigo: string
      observacion?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cuotasGeneradas } = await import('../../db/schema')

    const periodo = data.periodo.trim()
    const motivo = armarTextoMotivo(
      data.motivoCodigo,
      data.observacion || '',
    )

    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return { ok: false as const, error: 'Período inválido (YYYY-MM)' }
    }
    if (motivo.length < 3) {
      return { ok: false as const, error: 'Indicá un motivo válido' }
    }

    const aAnular = await db
      .select({
        id: cuotasGeneradas.id,
        concepto: cuotasGeneradas.concepto,
      })
      .from(cuotasGeneradas)
      .where(
        and(
          eq(cuotasGeneradas.periodo, periodo),
          eq(cuotasGeneradas.estado, 'pendiente'),
        ),
      )

    if (aAnular.length === 0) {
      return {
        ok: false as const,
        error: `No hay cuotas pendientes en ${periodo}`,
      }
    }

    let anuladas = 0
    for (const c of aAnular) {
      await db
        .update(cuotasGeneradas)
        .set({
          estado: 'anulada',
          concepto: `${c.concepto} · ANULADA (masiva): ${motivo}`.slice(
            0,
            500,
          ),
        })
        .where(eq(cuotasGeneradas.id, c.id))
      anuladas++
    }

    return {
      ok: true as const,
      periodo,
      anuladas,
      mensaje: `Se anularon ${anuladas} cuotas pendientes de ${periodo}`,
    }
  })

/** Anula pendientes de una persona en un período (desde pestaña Individual) */
export const anularCuotasPersonaPeriodo = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      periodo: string
      busqueda: string
      tipo: 'dni' | 'socio'
      motivoCodigo: string
      observacion?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { people, memberships, cuotasGeneradas } = await import(
      '../../db/schema'
    )

    const valor = data.busqueda.trim()
    const periodo = data.periodo.trim()
    const motivo = armarTextoMotivo(
      data.motivoCodigo,
      data.observacion || '',
    )

    if (!valor) return { ok: false as const, error: 'Ingresá DNI o n° socio' }
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return { ok: false as const, error: 'Período inválido' }
    }
    if (motivo.length < 3) {
      return { ok: false as const, error: 'Indicá un motivo válido' }
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

    const aAnular = await db
      .select()
      .from(cuotasGeneradas)
      .where(
        and(
          eq(cuotasGeneradas.personId, personId),
          eq(cuotasGeneradas.periodo, periodo),
          eq(cuotasGeneradas.estado, 'pendiente'),
        ),
      )

    if (aAnular.length === 0) {
      return {
        ok: false as const,
        error: 'No hay cuotas pendientes para esa persona en ese período',
      }
    }

    let anuladas = 0
    for (const c of aAnular) {
      await db
        .update(cuotasGeneradas)
        .set({
          estado: 'anulada',
          concepto: `${c.concepto} · ANULADA: ${motivo}`.slice(0, 500),
        })
        .where(eq(cuotasGeneradas.id, c.id))
      anuladas++
    }

    const nombre =
      aAnular[0].nombreCompleto ||
      `persona #${personId}`

    return {
      ok: true as const,
      anuladas,
      personId,
      nombre,
      mensaje: `${nombre}: se anularon ${anuladas} cuota(s) de ${periodo}`,
    }
  })