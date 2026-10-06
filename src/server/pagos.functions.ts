import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm'
import { requireUser } from './auth.server'

function normalizarBusqueda(valor: string) {
  return valor.trim().replace(/\D/g, '')
}

export const buscarPersonaParaPago = createServerFn({ method: 'GET' })
  .inputValidator((data: { busqueda: string }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { people, memberships, cuotasGeneradas } = await import(
      '../../db/schema'
    )

    const q = normalizarBusqueda(data.busqueda)

    if (!q) {
      return {
        ok: false as const,
        error: 'Ingresá un DNI o número de socio.',
      }
    }

    const rows = await db
      .select({
        id: people.id,
        documentNumber: people.documentNumber,
        firstName: people.firstName,
        lastName: people.lastName,
        memberNumber: memberships.memberNumber,
      })
      .from(people)
      .leftJoin(
        memberships,
        and(
          eq(memberships.personId, people.id),
          eq(memberships.status, 'activo'),
          isNull(memberships.endDate),
        ),
      )
      .where(
        or(eq(people.documentNumber, q), eq(memberships.memberNumber, q)),
      )
      .limit(10)

    if (rows.length === 0) {
      return {
        ok: false as const,
        error: 'No se encontró ninguna persona.',
      }
    }

    if (rows.length > 1) {
      return {
        ok: true as const,
        multiple: true as const,
        personas: rows,
      }
    }

    const persona = rows[0]

    const cuotas = await db
      .select({
        id: cuotasGeneradas.id,
        periodo: cuotasGeneradas.periodo,
        concepto: cuotasGeneradas.concepto,
        montoFinal: cuotasGeneradas.montoFinal,
        fechaVencimiento: cuotasGeneradas.fechaVencimiento,
        tipoCuota: cuotasGeneradas.tipoCuota,
      })
      .from(cuotasGeneradas)
      .where(
        and(
          eq(cuotasGeneradas.personId, persona.id),
          eq(cuotasGeneradas.estado, 'pendiente'),
        ),
      )
      .orderBy(asc(cuotasGeneradas.periodo), asc(cuotasGeneradas.id))

    return {
      ok: true as const,
      multiple: false as const,
      persona,
      cuotas,
    }
  })

export const listarMediosPagoActivos = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireUser()
  const { db } = await import('../../db')
  const { mediosPago } = await import('../../db/schema')

  const medios = await db
    .select()
    .from(mediosPago)
    .where(eq(mediosPago.activa, true))
    .orderBy(asc(mediosPago.orden), asc(mediosPago.nombre))

  return {
    ok: true as const,
    medios,
  }
})

export const registrarPagoIndividual = createServerFn({
  method: 'POST',
})
  .inputValidator(
    (data: {
      personId: number
      cuotaIds: number[]
      medioPagoId: number
      fechaPago: string
      referencia?: string
      observacion?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('../../db')
    const {
      people,
      mediosPago,
      cuotasGeneradas,
      pagos,
      pagoCuotas,
    } = await import('../../db/schema')

    if (!Number.isInteger(data.personId) || data.personId <= 0) {
      return {
        ok: false as const,
        error: 'Persona inválida.',
      }
    }

    const cuotaIds = [
      ...new Set(data.cuotaIds.filter((id) => Number.isInteger(id))),
    ]

    if (cuotaIds.length === 0) {
      return {
        ok: false as const,
        error: 'Seleccioná al menos una cuota.',
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fechaPago)) {
      return {
        ok: false as const,
        error: 'Fecha de pago inválida.',
      }
    }

    const [persona] = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.id, data.personId))
      .limit(1)

    if (!persona) {
      return {
        ok: false as const,
        error: 'La persona no existe.',
      }
    }

    const [medio] = await db
      .select({ id: mediosPago.id })
      .from(mediosPago)
      .where(
        and(
          eq(mediosPago.id, data.medioPagoId),
          eq(mediosPago.activa, true),
        ),
      )
      .limit(1)

    if (!medio) {
      return {
        ok: false as const,
        error: 'El medio de pago no es válido.',
      }
    }

    const cuotas = await db
      .select()
      .from(cuotasGeneradas)
      .where(
        and(
          eq(cuotasGeneradas.personId, data.personId),
          inArray(cuotasGeneradas.id, cuotaIds),
        ),
      )

    if (cuotas.length !== cuotaIds.length) {
      return {
        ok: false as const,
        error:
          'Una o más cuotas no pertenecen a la persona seleccionada.',
      }
    }

    const noDisponibles = cuotas.filter(
      (cuota) => cuota.estado !== 'pendiente',
    )

    if (noDisponibles.length > 0) {
      return {
        ok: false as const,
        error:
          'Una o más cuotas ya no están pendientes. Volvé a buscar la persona.',
      }
    }

    const montoTotal = cuotas.reduce(
      (sum, cuota) => sum + Number(cuota.montoFinal),
      0,
    )

    if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
      return {
        ok: false as const,
        error: 'El total del pago no es válido.',
      }
    }

    const periodos = [
      ...new Set(cuotas.map((cuota) => cuota.periodo)),
    ].sort()

    const periodo = periodos.length === 1 ? periodos[0] : null

    const resultado = await db.transaction(async (tx) => {
      const [pago] = await tx
        .insert(pagos)
        .values({
          personId: data.personId,
          fechaPago: data.fechaPago,
          montoTotal: montoTotal.toFixed(2),
          medioPagoId: data.medioPagoId,
          referencia: data.referencia?.trim() || null,
          periodo,
          observacion: data.observacion?.trim() || null,
          cargadoPor: user.userId,
        })
        .returning({
          id: pagos.id,
        })

      await tx.insert(pagoCuotas).values(
        cuotas.map((cuota) => ({
          pagoId: pago.id,
          cuotaId: cuota.id,
          montoAplicado: cuota.montoFinal,
        })),
      )

      await tx
        .update(cuotasGeneradas)
        .set({
          estado: 'pagada',
        })
        .where(
          and(
            eq(cuotasGeneradas.personId, data.personId),
            inArray(cuotasGeneradas.id, cuotaIds),
            eq(cuotasGeneradas.estado, 'pendiente'),
          ),
        )

      return pago
    })

    return {
      ok: true as const,
      pagoId: resultado.id,
      cantidadCuotas: cuotas.length,
      montoTotal,
    }
  })