import { createServerFn } from '@tanstack/react-start'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../db'
import { people, pagosImportados } from '../../db/schema'

export const consultarPagosPorDni = createServerFn({ method: 'GET' })
  .inputValidator((data: { dni: string }) => data)
  .handler(async ({ data }) => {
    const dni = data.dni.replace(/\D/g, '').trim()
    if (dni.length < 7) {
      return { ok: false as const, error: 'Ingresá un DNI válido' }
    }

    const [ultimaImportacion] = await db
      .select({
        createdAt: importBatches.createdAt,
      })
      .from(importBatches)
      .orderBy(desc(importBatches.createdAt))
      .limit(1)

    const ultimaActualizacion = ultimaImportacion?.createdAt
      ? new Intl.DateTimeFormat('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'America/Argentina/Buenos_Aires',
        }).format(ultimaImportacion.createdAt)
      : null

    const pagos = await db
      .select({
        id: pagosImportados.id,
        fechaPago: pagosImportados.fechaPago,
        periodo: pagosImportados.periodo,
        importe: pagosImportados.importe,
        formaPago: pagosImportados.formaPago,
        categoria: pagosImportados.categoria,
        nombreSocio: pagosImportados.nombreSocio,
        pagador: pagosImportados.pagador,
      })
      .from(pagosImportados)
      .where(eq(pagosImportados.dni, dni))
      .orderBy(desc(pagosImportados.fechaPago), desc(pagosImportados.periodo))

    if (pagos.length === 0) {
      // ¿Existe la persona pero sin pagos importados?
      const [persona] = await db
        .select({
          firstName: people.firstName,
          lastName: people.lastName,
        })
        .from(people)
        .where(eq(people.documentNumber, dni))
        .limit(1)

      if (persona) {
        return {
          ok: true as const,
          dni,
          nombre: `${persona.lastName}, ${persona.firstName}`,
          pagos: [],
          ultimaActualizacion,
          mensaje: 'No hay pagos registrados para este DNI en el sistema.',
        }
      }

      return {
        ok: false as const,
        error:
          'No se encontraron pagos con ese DNI. Verificá el número o consultá en secretaría.',
      }
    }

    const nombre =
      pagos.find((p) => p.nombreSocio)?.nombreSocio ||
      (await (async () => {
        const [persona] = await db
          .select({
            firstName: people.firstName,
            lastName: people.lastName,
          })
          .from(people)
          .where(eq(people.documentNumber, dni))
          .limit(1)
        return persona ? `${persona.lastName}, ${persona.firstName}` : null
      })())

    return {
      ok: true as const,
      dni,
      nombre: nombre || `DNI ${dni}`,
      ultimaActualizacion,
      pagos: pagos.map((p) => ({
        id: p.id,
        fechaPago: p.fechaPago,
        periodo: p.periodo,
        importe: p.importe,
        formaPago: p.formaPago,
        categoria: p.categoria,
        pagador: p.pagador,
      })),
    }
  })