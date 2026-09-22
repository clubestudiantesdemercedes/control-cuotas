import { createServerFn } from '@tanstack/react-start'
import { eq, and, gte, desc, inArray, isNull } from 'drizzle-orm'
import { db } from '../../db'
import {
  people,
  memberships,
  cuotasGeneradas,
  pagos,
  mediosPago,
  pagoCuotas,
} from '../../db/schema'

function periodoHaceMeses(meses: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - meses)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const buscarPorDocumentoOSocio = createServerFn({ method: 'GET' })
  .inputValidator((data: { valor: string; tipo: 'dni' | 'socio' | 'grupo' }) => data)
  .handler(async ({ data }) => {
    try {
      const { valor, tipo } = data
      const busqueda = valor.trim()

      if (!busqueda) {
        return { ok: false as const, error: 'Ingresá un valor para buscar' }
      }

      let personIds: number[] = []
      let personas: Array<{
        id: number
        documentNumber: string
        firstName: string
        lastName: string
      }> = []
      const membresiasPorPersona: Record<
        number,
        { memberNumber: string | null; category: string | null } | null
      > = {}

      if (tipo === 'dni') {
        const rows = await db
          .select()
          .from(people)
          .where(
            and(eq(people.documentNumber, busqueda), eq(people.status, 'activo')),
          )
        personas = rows
        personIds = rows.map((p) => p.id)

        if (personIds.length > 0) {
          const mems = await db
            .select()
            .from(memberships)
            .where(
              and(
                inArray(memberships.personId, personIds),
                eq(memberships.status, 'activo'),
                isNull(memberships.endDate),
              ),
            )
          for (const m of mems) {
            membresiasPorPersona[m.personId] = {
              memberNumber: m.memberNumber,
              category: m.category,
            }
          }
        }
      } else if (tipo === 'socio') {
        const memRows = await db
          .select({
            membership: memberships,
            person: people,
          })
          .from(memberships)
          .innerJoin(people, eq(memberships.personId, people.id))
          .where(
            and(
              eq(memberships.memberNumber, busqueda),
              eq(memberships.status, 'activo'),
              isNull(memberships.endDate),
              eq(people.status, 'activo'),
            ),
          )

        for (const row of memRows) {
          personIds.push(row.person.id)
          personas.push(row.person)
          membresiasPorPersona[row.person.id] = {
            memberNumber: row.membership.memberNumber,
            category: row.membership.category,
          }
        }
      } else {
        return {
          ok: false as const,
          error: 'Búsqueda por grupo familiar: próximamente',
        }
      }

      if (!personIds.length) {
        return {
          ok: false as const,
          error: 'No se encontró ninguna persona con esos datos',
        }
      }

      const cuotasPendientes = await db
        .select()
        .from(cuotasGeneradas)
        .where(
          and(
            inArray(cuotasGeneradas.personId, personIds),
            eq(cuotasGeneradas.estado, 'pendiente'),
          ),
        )
        .orderBy(desc(cuotasGeneradas.periodo))

      const saldo = cuotasPendientes.reduce(
        (acc, c) => acc + Number(c.montoFinal),
        0,
      )

      const periodoDesde = periodoHaceMeses(12)
      const historialCuotas = await db
        .select()
        .from(cuotasGeneradas)
        .where(
          and(
            inArray(cuotasGeneradas.personId, personIds),
            gte(cuotasGeneradas.periodo, periodoDesde),
          ),
        )
        .orderBy(desc(cuotasGeneradas.periodo))

      const fechaDesde = new Date()
      fechaDesde.setMonth(fechaDesde.getMonth() - 12)
      const fechaDesdeStr = fechaDesde.toISOString().slice(0, 10)

      const historialPagosRaw = await db
        .select({
          id: pagos.id,
          fechaPago: pagos.fechaPago,
          montoTotal: pagos.montoTotal,
          periodo: pagos.periodo,
          referencia: pagos.referencia,
          observacion: pagos.observacion,
          medioNombre: mediosPago.nombre,
          medioTipo: mediosPago.tipo,
        })
        .from(pagos)
        .leftJoin(mediosPago, eq(pagos.medioPagoId, mediosPago.id))
        .where(
          and(
            inArray(pagos.personId, personIds),
            gte(pagos.fechaPago, fechaDesdeStr),
          ),
        )
        .orderBy(desc(pagos.fechaPago))

      const pagoIds = historialPagosRaw.map((p) => p.id)
      let aplicaciones: Array<{ pagoId: number; periodo: string }> = []

      if (pagoIds.length > 0) {
        aplicaciones = await db
          .select({
            pagoId: pagoCuotas.pagoId,
            periodo: cuotasGeneradas.periodo,
          })
          .from(pagoCuotas)
          .innerJoin(
            cuotasGeneradas,
            eq(pagoCuotas.cuotaId, cuotasGeneradas.id),
          )
          .where(inArray(pagoCuotas.pagoId, pagoIds))
      }

      const historialPagos = historialPagosRaw.map((p) => ({
        ...p,
        periodosAplicados: aplicaciones
          .filter((a) => a.pagoId === p.id)
          .map((a) => a.periodo),
      }))

      const socios = personas.map((p) => {
        const mem = membresiasPorPersona[p.id]
        return {
          id: p.id,
          documento: p.documentNumber,
          apellido: p.lastName,
          nombre: p.firstName,
          numeroSocio: mem?.memberNumber ?? null,
          tipoSocioSocial: mem?.category ?? null,
          tieneMembresiaActiva: Boolean(mem),
        }
      })

      return {
        ok: true as const,
        socios,
        saldo,
        cuotasPendientes,
        historialCuotas,
        historialPagos,
      }
    } catch (err) {
      console.error('Error en buscarPorDocumentoOSocio:', err)
      return {
        ok: false as const,
        error: 'Error interno al consultar la base de datos',
      }
    }
  })