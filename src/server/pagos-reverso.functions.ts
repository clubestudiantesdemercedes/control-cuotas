import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { requireUser } from './auth.server'

function normalizarBusqueda(valor: string) {
  return valor.trim().replace(/\D/g, '')
}

export const buscarPagos = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      busqueda?: string
      fechaDesde?: string
      fechaHasta?: string
      soloActivos?: boolean
      limit?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { pagos, people, memberships, mediosPago } = await import(
      '../../db/schema'
    )

    const lim = Math.min(Math.max(data.limit ?? 50, 1), 200)
    const soloActivos = data.soloActivos !== false

    const condiciones: any[] = []

    if (soloActivos) {
      condiciones.push(eq(pagos.estado, 'activo'))
    }

    if (data.fechaDesde && /^\d{4}-\d{2}-\d{2}$/.test(data.fechaDesde)) {
      condiciones.push(gte(pagos.fechaPago, data.fechaDesde))
    }
    if (data.fechaHasta && /^\d{4}-\d{2}-\d{2}$/.test(data.fechaHasta)) {
      condiciones.push(lte(pagos.fechaPago, data.fechaHasta))
    }

    const q = data.busqueda ? normalizarBusqueda(data.busqueda) : ''
    if (q) {
      condiciones.push(
        or(eq(people.documentNumber, q), eq(memberships.memberNumber, q)),
      )
    }

    const rows = await db
      .select({
        id: pagos.id,
        fechaPago: pagos.fechaPago,
        montoTotal: pagos.montoTotal,
        periodo: pagos.periodo,
        referencia: pagos.referencia,
        observacion: pagos.observacion,
        estado: pagos.estado,
        motivoAnulacion: pagos.motivoAnulacion,
        anuladoEn: pagos.anuladoEn,
        personId: pagos.personId,
        documentNumber: people.documentNumber,
        firstName: people.firstName,
        lastName: people.lastName,
        memberNumber: memberships.memberNumber,
        medioNombre: mediosPago.nombre,
      })
      .from(pagos)
      .leftJoin(people, eq(pagos.personId, people.id))
      .leftJoin(
        memberships,
        and(
          eq(memberships.personId, people.id),
          eq(memberships.status, 'activo'),
          isNull(memberships.endDate),
        ),
      )
      .leftJoin(mediosPago, eq(pagos.medioPagoId, mediosPago.id))
      .where(condiciones.length ? and(...condiciones) : undefined)
      .orderBy(desc(pagos.fechaPago), desc(pagos.id))
      .limit(lim)

    return { ok: true as const, pagos: rows }
  })

export const getDetallePago = createServerFn({ method: 'GET' })
  .inputValidator((data: { pagoId: number }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const {
      pagos,
      people,
      memberships,
      mediosPago,
      pagoCuotas,
      cuotasGeneradas,
    } = await import('../../db/schema')

    const [pago] = await db
      .select({
        id: pagos.id,
        personId: pagos.personId,
        fechaPago: pagos.fechaPago,
        montoTotal: pagos.montoTotal,
        periodo: pagos.periodo,
        referencia: pagos.referencia,
        observacion: pagos.observacion,
        estado: pagos.estado,
        motivoAnulacion: pagos.motivoAnulacion,
        anuladoEn: pagos.anuladoEn,
        medioPagoId: pagos.medioPagoId,
        medioNombre: mediosPago.nombre,
        documentNumber: people.documentNumber,
        firstName: people.firstName,
        lastName: people.lastName,
        memberNumber: memberships.memberNumber,
      })
      .from(pagos)
      .leftJoin(people, eq(pagos.personId, people.id))
      .leftJoin(
        memberships,
        and(
          eq(memberships.personId, people.id),
          eq(memberships.status, 'activo'),
          isNull(memberships.endDate),
        ),
      )
      .leftJoin(mediosPago, eq(pagos.medioPagoId, mediosPago.id))
      .where(eq(pagos.id, data.pagoId))
      .limit(1)

    if (!pago) {
      return { ok: false as const, error: 'Pago no encontrado' }
    }

    const lineas = await db
      .select({
        pagoCuotaId: pagoCuotas.id,
        cuotaId: pagoCuotas.cuotaId,
        montoAplicado: pagoCuotas.montoAplicado,
        periodo: cuotasGeneradas.periodo,
        concepto: cuotasGeneradas.concepto,
        montoFinal: cuotasGeneradas.montoFinal,
        estadoCuota: cuotasGeneradas.estado,
      })
      .from(pagoCuotas)
      .innerJoin(cuotasGeneradas, eq(pagoCuotas.cuotaId, cuotasGeneradas.id))
      .where(eq(pagoCuotas.pagoId, data.pagoId))
      .orderBy(asc(cuotasGeneradas.periodo))

    // Cuotas pendientes de la misma persona (para reimputar)
    let pendientes: {
      id: number
      periodo: string
      concepto: string
      montoFinal: string
    }[] = []

    if (pago.personId && pago.estado === 'activo') {
      pendientes = await db
        .select({
          id: cuotasGeneradas.id,
          periodo: cuotasGeneradas.periodo,
          concepto: cuotasGeneradas.concepto,
          montoFinal: cuotasGeneradas.montoFinal,
        })
        .from(cuotasGeneradas)
        .where(
          and(
            eq(cuotasGeneradas.personId, pago.personId),
            eq(cuotasGeneradas.estado, 'pendiente'),
          ),
        )
        .orderBy(asc(cuotasGeneradas.periodo), asc(cuotasGeneradas.id))
    }

    return {
      ok: true as const,
      pago,
      lineas,
      pendientes,
    }
  })

export const anularPago = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { pagoId: number; motivo: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('../../db')
    const { pagos, pagoCuotas, cuotasGeneradas } = await import(
      '../../db/schema'
    )

    const motivo = (data.motivo || '').trim()
    if (motivo.length < 3) {
      return {
        ok: false as const,
        error: 'Indicá un motivo de anulación (mínimo 3 caracteres).',
      }
    }

    const [pago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, data.pagoId))
      .limit(1)

    if (!pago) {
      return { ok: false as const, error: 'Pago no encontrado' }
    }
    if (pago.estado === 'anulado') {
      return { ok: false as const, error: 'El pago ya está anulado' }
    }

    const links = await db
      .select()
      .from(pagoCuotas)
      .where(eq(pagoCuotas.pagoId, data.pagoId))

    const cuotaIds = links.map((l) => l.cuotaId)

    await db.transaction(async (tx) => {
      await tx
        .update(pagos)
        .set({
          estado: 'anulado',
          anuladoEn: new Date(),
          anuladoPor: user.userId,
          motivoAnulacion: motivo,
        })
        .where(eq(pagos.id, data.pagoId))

      // Volver a pendiente las cuotas que no tengan otro pago activo
      for (const cuotaId of cuotaIds) {
        const otros = await tx
          .select({ id: pagoCuotas.id })
          .from(pagoCuotas)
          .innerJoin(pagos, eq(pagoCuotas.pagoId, pagos.id))
          .where(
            and(
              eq(pagoCuotas.cuotaId, cuotaId),
              eq(pagos.estado, 'activo'),
              sql`${pagos.id} <> ${data.pagoId}`,
            ),
          )
          .limit(1)

        if (otros.length === 0) {
          await tx
            .update(cuotasGeneradas)
            .set({ estado: 'pendiente' })
            .where(
              and(
                eq(cuotasGeneradas.id, cuotaId),
                eq(cuotasGeneradas.estado, 'pagada'),
              ),
            )
        }
      }
    })

    return {
      ok: true as const,
      mensaje: `Pago #${data.pagoId} anulado. ${cuotaIds.length} cuota(s) revisada(s).`,
      cuotaIds,
    }
  })

export const reimputarPago = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      pagoId: number
      motivo: string
      nuevasCuotaIds: number[]
      fechaPago?: string
      medioPagoId?: number
      referencia?: string
      observacion?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('../../db')
    const {
      pagos,
      pagoCuotas,
      cuotasGeneradas,
      mediosPago,
    } = await import('../../db/schema')

    const motivo = (data.motivo || '').trim()
    if (motivo.length < 3) {
      return {
        ok: false as const,
        error: 'Indicá un motivo de reimputación (mínimo 3 caracteres).',
      }
    }

    const nuevasIds = [
      ...new Set(data.nuevasCuotaIds.filter((id) => Number.isInteger(id))),
    ]
    if (nuevasIds.length === 0) {
      return {
        ok: false as const,
        error: 'Seleccioná al menos una cuota destino.',
      }
    }

    const [pagoOrig] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.id, data.pagoId))
      .limit(1)

    if (!pagoOrig) {
      return { ok: false as const, error: 'Pago no encontrado' }
    }
    if (pagoOrig.estado === 'anulado') {
      return { ok: false as const, error: 'El pago ya está anulado' }
    }
    if (!pagoOrig.personId) {
      return {
        ok: false as const,
        error: 'El pago no tiene persona asociada',
      }
    }

    const nuevasCuotas = await db
      .select()
      .from(cuotasGeneradas)
      .where(
        and(
          eq(cuotasGeneradas.personId, pagoOrig.personId),
          inArray(cuotasGeneradas.id, nuevasIds),
          eq(cuotasGeneradas.estado, 'pendiente'),
        ),
      )

    if (nuevasCuotas.length !== nuevasIds.length) {
      return {
        ok: false as const,
        error:
          'Una o más cuotas destino no están pendientes o no pertenecen a la persona.',
      }
    }

    const montoNuevo = nuevasCuotas.reduce(
      (s, c) => s + Number(c.montoFinal),
      0,
    )
    const montoOrig = Number(pagoOrig.montoTotal)

    // Misma lógica que registro: el total debe coincidir (sin parciales)
    if (Math.abs(montoNuevo - montoOrig) > 0.01) {
      return {
        ok: false as const,
        error: `El total de las cuotas destino ($${montoNuevo.toLocaleString('es-AR')}) no coincide con el pago original ($${montoOrig.toLocaleString('es-AR')}).`,
      }
    }

    const medioId = data.medioPagoId ?? pagoOrig.medioPagoId
    const [medio] = await db
      .select({ id: mediosPago.id })
      .from(mediosPago)
      .where(eq(mediosPago.id, medioId))
      .limit(1)

    if (!medio) {
      return { ok: false as const, error: 'Medio de pago inválido' }
    }

    const fechaPago =
      data.fechaPago && /^\d{4}-\d{2}-\d{2}$/.test(data.fechaPago)
        ? data.fechaPago
        : pagoOrig.fechaPago

    const periodos = [...new Set(nuevasCuotas.map((c) => c.periodo))].sort()
    const periodo = periodos.length === 1 ? periodos[0] : null

    const linksOrig = await db
      .select()
      .from(pagoCuotas)
      .where(eq(pagoCuotas.pagoId, data.pagoId))
    const cuotaIdsOrig = linksOrig.map((l) => l.cuotaId)

    const nuevoId = await db.transaction(async (tx) => {
      // 1) Anular original
      await tx
        .update(pagos)
        .set({
          estado: 'anulado',
          anuladoEn: new Date(),
          anuladoPor: user.userId,
          motivoAnulacion: `Reimputación: ${motivo}`,
        })
        .where(eq(pagos.id, data.pagoId))

      for (const cuotaId of cuotaIdsOrig) {
        const otros = await tx
          .select({ id: pagoCuotas.id })
          .from(pagoCuotas)
          .innerJoin(pagos, eq(pagoCuotas.pagoId, pagos.id))
          .where(
            and(
              eq(pagoCuotas.cuotaId, cuotaId),
              eq(pagos.estado, 'activo'),
              sql`${pagos.id} <> ${data.pagoId}`,
            ),
          )
          .limit(1)

        if (otros.length === 0) {
          await tx
            .update(cuotasGeneradas)
            .set({ estado: 'pendiente' })
            .where(
              and(
                eq(cuotasGeneradas.id, cuotaId),
                eq(cuotasGeneradas.estado, 'pagada'),
              ),
            )
        }
      }

      // 2) Nuevo pago
      const [nuevo] = await tx
        .insert(pagos)
        .values({
          personId: pagoOrig.personId,
          fechaPago,
          montoTotal: montoNuevo.toFixed(2),
          medioPagoId: medioId,
          referencia: data.referencia?.trim() || pagoOrig.referencia,
          periodo,
          observacion:
            data.observacion?.trim() ||
            `Reimputado desde pago #${data.pagoId}`,
          cargadoPor: user.userId,
          estado: 'activo',
        })
        .returning({ id: pagos.id })

      await tx.insert(pagoCuotas).values(
        nuevasCuotas.map((c) => ({
          pagoId: nuevo.id,
          cuotaId: c.id,
          montoAplicado: c.montoFinal,
        })),
      )

      await tx
        .update(cuotasGeneradas)
        .set({ estado: 'pagada' })
        .where(
          and(
            inArray(cuotasGeneradas.id, nuevasIds),
            eq(cuotasGeneradas.estado, 'pendiente'),
          ),
        )

      return nuevo.id
    })

    return {
      ok: true as const,
      mensaje: `Pago #${data.pagoId} anulado y reimputado como pago #${nuevoId}.`,
      pagoAnuladoId: data.pagoId,
      pagoNuevoId: nuevoId,
    }
  })