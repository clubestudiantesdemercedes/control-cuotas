import { createServerFn } from '@tanstack/react-start'
import { desc, eq, isNull, and, asc } from 'drizzle-orm'
import { db } from '../../db'
import {
  people,
  memberships,
  disciplinas,
  categoriasDeportivas,
  inscripcionesDeportivas,
} from '../../db/schema'
import { requireUser } from './auth.server'

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
      memberNumber?: string
      category?: 'menor' | 'cadete' | 'activo' | 'vitalicio'
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
      return { ok: false as const, error: 'Completá documento, nombre y apellido' }
    }

    if (data.esSocio && data.esDeportista) {
      if (!data.disciplinaId || !data.categoriaDeportivaId) {
        return {
          ok: false as const,
          error: 'Elegí el deporte y la categoría deportiva',
        }
      }
    }

    if (data.esSocio && !data.esDeportista && !data.category) {
      return { ok: false as const, error: 'Elegí la categoría social' }
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
        return { ok: true as const, personId: persona.id }
      }

      const startDate = new Date().toISOString().slice(0, 10)
      const memberNumber = data.memberNumber?.trim() || null

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

      if (data.esDeportista && data.disciplinaId && data.categoriaDeportivaId) {
        await db.insert(inscripcionesDeportivas).values({
          personId: persona.id,
          disciplinaId: data.disciplinaId,
          categoriaDeportivaId: data.categoriaDeportivaId,
          esHermano: false,
          esTercerHermano: false,
          esSegundoDeporte: false,
          fechaInicio: startDate,
          activa: true,
        })
      }

      return { ok: true as const, personId: persona.id }
    } catch (err: any) {
      console.error(err)
      if (
        String(err?.message || err).includes('unique') ||
        String(err).includes('duplicate')
      ) {
        return {
          ok: false as const,
          error: 'Ya existe una persona con ese documento o n° de socio',
        }
      }
      return { ok: false as const, error: 'No se pudo guardar la persona' }
    }
  })