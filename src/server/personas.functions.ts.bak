import { createServerFn } from '@tanstack/react-start'
import { desc, eq, isNull, and, asc } from 'drizzle-orm'
import { db } from '../../db'
import {
  people,
  memberships,
  disciplinas,
  categoriasDeportivas,
  inscripcionesDeportivas,
  clubConfig,
} from '../../db/schema'
import { requireUser } from './auth.server'
import { resolverCategoriaDeportiva } from './deportes.functions'

function calcularCategoriaPorEdad(
  birthDate?: string | null,
): 'menor' | 'cadete' | 'activo' {
  if (!birthDate) return 'activo'
  const hoy = new Date()
  const nac = new Date(birthDate)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  if (edad < 12) return 'menor'
  if (edad < 18) return 'cadete'
  return 'activo'
}

async function obtenerYReservarNumeroSocio(): Promise<string> {
  const rows = await db
    .select()
    .from(clubConfig)
    .where(eq(clubConfig.key, 'ultimo_numero_socio'))
    .limit(1)

  const ultimo = rows[0] ? Number(rows[0].value) || 0 : 0
  const proximo = ultimo + 1
  const value = String(proximo)

  if (rows[0]) {
    await db
      .update(clubConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(clubConfig.key, 'ultimo_numero_socio'))
  } else {
    await db.insert(clubConfig).values({
      key: 'ultimo_numero_socio',
      value,
    })
  }

  return value
}

export const listarPersonas = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()

    const rows = await db
      .select({
        id: people.id,
        documentNumber: people.documentNumber,
        firstName: people.firstName,
        lastName: people.lastName,
        birthDate: people.birthDate,
        status: people.status,
        address: people.address,
        addressCobro: people.addressCobro,
        phone: people.phone,
        phoneAlt: people.phoneAlt,
        tieneDebitoAutomatico: people.tieneDebitoAutomatico,
        memberNumber: memberships.memberNumber,
        category: memberships.category,
        membershipStatus: memberships.status,
        membershipId: memberships.id,
        deporte: disciplinas.nombre,
        categoriaDeportiva: categoriasDeportivas.nombre,
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
      .leftJoin(
        inscripcionesDeportivas,
        and(
          eq(inscripcionesDeportivas.personId, people.id),
          eq(inscripcionesDeportivas.activa, true),
        ),
      )
      .leftJoin(disciplinas, eq(inscripcionesDeportivas.disciplinaId, disciplinas.id))
      .leftJoin(
        categoriasDeportivas,
        eq(inscripcionesDeportivas.categoriaDeportivaId, categoriasDeportivas.id),
      )
      .orderBy(desc(people.id))
      .limit(300)

    return { ok: true as const, personas: rows }
  },
)

export const getPersona = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await requireUser()

    const [persona] = await db
      .select()
      .from(people)
      .where(eq(people.id, data.id))
      .limit(1)

    if (!persona) {
      return { ok: false as const, error: 'Persona no encontrada' }
    }

    const [membresia] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.personId, data.id),
          eq(memberships.status, 'activo'),
          isNull(memberships.endDate),
        ),
      )
      .limit(1)

    const inscripciones = await db
      .select({
        id: inscripcionesDeportivas.id,
        disciplinaId: inscripcionesDeportivas.disciplinaId,
        categoriaDeportivaId: inscripcionesDeportivas.categoriaDeportivaId,
        deporte: disciplinas.nombre,
        categoriaDeportiva: categoriasDeportivas.nombre,
      })
      .from(inscripcionesDeportivas)
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
      .where(
        and(
          eq(inscripcionesDeportivas.personId, data.id),
          eq(inscripcionesDeportivas.activa, true),
        ),
      )

    return {
      ok: true as const,
      persona,
      membresia: membresia ?? null,
      inscripcion: inscripciones[0] ?? null,
    }
  })
export const listarDeportesParaAlta = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
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

export const crearPersona = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      documentNumber: string
      firstName: string
      lastName: string
      birthDate?: string
      address?: string
      addressCobro?: string
      phone?: string
      phoneAlt?: string
      tieneDebitoAutomatico?: boolean
      esSocio: boolean
      esDeportista: boolean
      category?: 'menor' | 'cadete' | 'activo' | 'vitalicio'
      disciplinaId?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()

    const documentNumber = data.documentNumber.replace(/\D/g, '').trim()
    const firstName = data.firstName.trim()
    const lastName = data.lastName.trim()

    if (!documentNumber || !firstName || !lastName) {
      return {
        ok: false as const,
        error: 'Completá documento, nombre y apellido',
      }
    }

    if (data.esSocio && data.esDeportista) {
      if (!data.disciplinaId) {
        return {
          ok: false as const,
          error: 'Elegí el deporte',
        }
      }

      if (!data.birthDate) {
        return {
          ok: false as const,
          error:
            'La persona necesita fecha de nacimiento para determinar la categoría deportiva',
        }
      }
    }

    if (data.esSocio && !data.esDeportista && !data.category) {
      return {
        ok: false as const,
        error: 'Elegí la categoría social',
      }
    }

    try {
      const [persona] = await db
        .insert(people)
        .values({
          documentType: 'DNI',
          documentNumber,
          firstName,
          lastName,
          birthDate: data.birthDate || null,
          address: data.address?.trim() || null,
          addressCobro: data.addressCobro?.trim() || null,
          phone: data.phone?.trim() || null,
          phoneAlt: data.phoneAlt?.trim() || null,
          tieneDebitoAutomatico: data.tieneDebitoAutomatico ?? false,
          status: 'activo',
          recordSource: 'admin',
        })
        .returning({ id: people.id })

      if (!data.esSocio) {
        return {
          ok: true as const,
          personId: persona.id,
        }
      }

      const startDate = new Date().toISOString().slice(0, 10)
      const memberNumber = await obtenerYReservarNumeroSocio()

      // La categoría social sigue siendo independiente
      // de la categoría deportiva.
      const category = data.esDeportista
        ? calcularCategoriaPorEdad(data.birthDate)
        : data.category!

      await db.insert(memberships).values({
        personId: persona.id,
        memberNumber,
        category,
        status: 'activo',
        startDate,
      })

      let categoriaDeportivaId: number | null = null
      let nombreCategoriaDeportiva: string | null = null

      if (data.esDeportista && data.disciplinaId && data.birthDate) {
        const resultadoCategoria = await resolverCategoriaDeportiva(
          data.disciplinaId,
          data.birthDate,
        )

        if (!resultadoCategoria.ok) {
          return {
            ok: false as const,
            error: resultadoCategoria.error,
          }
        }

        categoriaDeportivaId = resultadoCategoria.categoria.id
        nombreCategoriaDeportiva =
          resultadoCategoria.categoria.nombre

        await db.insert(inscripcionesDeportivas).values({
          personId: persona.id,
          disciplinaId: data.disciplinaId,
          categoriaDeportivaId,
          esHermano: false,
          esTercerHermano: false,
          esSegundoDeporte: false,
          fechaInicio: startDate,
          activa: true,
        })
      }

      return {
        ok: true as const,
        personId: persona.id,
        memberNumber,
        categoriaDeportivaId,
        categoriaDeportiva: nombreCategoriaDeportiva,
      }
    } catch (err: any) {
      console.error(err)

      if (
        String(err?.message || err).includes('unique') ||
        String(err).includes('duplicate')
      ) {
        return {
          ok: false as const,
          error:
            'Ya existe una persona con ese documento o n° de socio',
        }
      }

      return {
        ok: false as const,
        error: 'No se pudo guardar la persona',
      }
    }
  })
export const actualizarPersona = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      documentNumber: string
      firstName: string
      lastName: string
      birthDate?: string
      address?: string
      addressCobro?: string
      phone?: string
      phoneAlt?: string
      tieneDebitoAutomatico?: boolean
      // acciones de membresÃ­a / deporte
      hacerSocio?: boolean
      category?: 'menor' | 'cadete' | 'activo' | 'vitalicio' | null
      agregarOCambiarDeporte?: boolean
      quitarDeporte?: boolean
      disciplinaId?: number
      categoriaDeportivaId?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()

    const documentNumber = data.documentNumber.replace(/\D/g, '').trim()
    const firstName = data.firstName.trim()
    const lastName = data.lastName.trim()

    if (!documentNumber || !firstName || !lastName) {
      return { ok: false as const, error: 'CompletÃ¡ documento, nombre y apellido' }
    }

    try {
      await db
        .update(people)
        .set({
          documentNumber,
          firstName,
          lastName,
          birthDate: data.birthDate || null,
          address: data.address?.trim() || null,
          addressCobro: data.addressCobro?.trim() || null,
          phone: data.phone?.trim() || null,
          phoneAlt: data.phoneAlt?.trim() || null,
          tieneDebitoAutomatico: data.tieneDebitoAutomatico ?? false,
          updatedAt: new Date(),
        })
        .where(eq(people.id, data.id))

      const [mem] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.personId, data.id),
            eq(memberships.status, 'activo'),
            isNull(memberships.endDate),
          ),
        )
        .limit(1)

      const startDate = new Date().toISOString().slice(0, 10)

      // No socio â†’ socio
      if (!mem && data.hacerSocio) {
        const memberNumber = await obtenerYReservarNumeroSocio()
        const category =
          data.category || calcularCategoriaPorEdad(data.birthDate)
        await db.insert(memberships).values({
          personId: data.id,
          memberNumber,
          category,
          status: 'activo',
          startDate,
        })
      }

      // Actualizar categorÃ­a social si ya es socio
      if (mem && data.category) {
        await db
          .update(memberships)
          .set({ category: data.category, updatedAt: new Date() })
          .where(eq(memberships.id, mem.id))
      }

      const [insc] = await db
        .select()
        .from(inscripcionesDeportivas)
        .where(
          and(
            eq(inscripcionesDeportivas.personId, data.id),
            eq(inscripcionesDeportivas.activa, true),
          ),
        )
        .limit(1)

      // Quitar deporte
      if (insc && data.quitarDeporte) {
        await db
          .update(inscripcionesDeportivas)
          .set({ activa: false, fechaFin: startDate })
          .where(eq(inscripcionesDeportivas.id, insc.id))
      }

      // Agregar o cambiar deporte (requiere ser socio)
      const esSocioAhora = mem || data.hacerSocio
      if (
        esSocioAhora &&
        data.agregarOCambiarDeporte &&
        data.disciplinaId &&
        data.categoriaDeportivaId
      ) {
        if (insc && !data.quitarDeporte) {
          await db
            .update(inscripcionesDeportivas)
            .set({
              disciplinaId: data.disciplinaId,
              categoriaDeportivaId: data.categoriaDeportivaId,
            })
            .where(eq(inscripcionesDeportivas.id, insc.id))
        } else if (!insc || data.quitarDeporte) {
          // si acabamos de quitar, o no tenÃ­a: crear nueva
          if (insc && data.quitarDeporte) {
            // ya desactivada arriba
          }
          await db.insert(inscripcionesDeportivas).values({
            personId: data.id,
            disciplinaId: data.disciplinaId,
            categoriaDeportivaId: data.categoriaDeportivaId,
            esHermano: false,
            esTercerHermano: false,
            esSegundoDeporte: false,
            fechaInicio: startDate,
            activa: true,
          })
        }
      }

      return { ok: true as const }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'No se pudo actualizar' }
    }
  })


