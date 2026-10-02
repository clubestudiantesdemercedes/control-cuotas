import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { disciplinas, categoriasDeportivas, people } from '../../db/schema'
import { requireUser } from './auth.server'

export const listarDisciplinas = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const rows = await db
      .select()
      .from(disciplinas)
      .orderBy(asc(disciplinas.nombre))
    return { ok: true as const, disciplinas: rows }
  },
)

export const crearDisciplina = createServerFn({ method: 'POST' })
  .inputValidator((data: { nombre: string }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const nombre = data.nombre.trim()
    if (!nombre) {
      return { ok: false as const, error: 'IngresÃ¡ el nombre del deporte' }
    }
    try {
      const [row] = await db
        .insert(disciplinas)
        .values({ nombre, activa: true })
        .returning()
      return { ok: true as const, disciplina: row }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'No se pudo crear el deporte' }
    }
  })

export const listarCategoriasPorDisciplina = createServerFn({ method: 'GET' })
  .inputValidator((data: { disciplinaId: number }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const rows = await db
      .select()
      .from(categoriasDeportivas)
      .where(eq(categoriasDeportivas.disciplinaId, data.disciplinaId))
      .orderBy(asc(categoriasDeportivas.nombre))
    return { ok: true as const, categorias: rows }
  })

export const crearCategoriaDeportiva = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      disciplinaId: number
      nombre: string
      edadDesde?: number | null
      edadHasta?: number | null
      mesesCobro: number[]
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const nombre = data.nombre.trim()
    if (!nombre || !data.disciplinaId) {
      return { ok: false as const, error: 'CompletÃ¡ deporte y nombre de categorÃ­a' }
    }
    if (!data.mesesCobro?.length) {
      return { ok: false as const, error: 'ElegÃ­ al menos un mes de cobro' }
    }
    try {
      const [row] = await db
        .insert(categoriasDeportivas)
        .values({
          disciplinaId: data.disciplinaId,
          nombre,
          edadDesde: data.edadDesde ?? null,
          edadHasta: data.edadHasta ?? null,
          mesesCobro: data.mesesCobro,
          activa: true,
        })
        .returning()
      return { ok: true as const, categoria: row }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'No se pudo crear la categorÃ­a' }
    }
  })
export async function resolverCategoriaDeportiva(
  disciplinaId: number,
  birthDate: string,
) {
  const [disciplina] = await db
    .select({
      id: disciplinas.id,
      nombre: disciplinas.nombre,
    })
    .from(disciplinas)
    .where(eq(disciplinas.id, disciplinaId))
    .limit(1)

  if (!disciplina) {
    return {
      ok: false as const,
      error: 'No se encontró la disciplina',
    }
  }

  const categorias = await db
    .select()
    .from(categoriasDeportivas)
    .where(eq(categoriasDeportivas.disciplinaId, disciplinaId))
    .orderBy(asc(categoriasDeportivas.nombre))

  if (!categorias.length) {
    return {
      ok: false as const,
      error: 'La disciplina no tiene categorías configuradas',
    }
  }

  const fechaNacimiento = new Date(`${birthDate}T00:00:00`)
  const anioNacimiento = fechaNacimiento.getFullYear()
  const anioActual = new Date().getFullYear()
  const edadDeportiva = anioActual - anioNacimiento

  // Categorías cuyo nombre es un año de nacimiento.
  const categoriaPorAnio = categorias.find(
    (categoria) =>
      /^\d{4}$/.test(categoria.nombre.trim()) &&
      Number(categoria.nombre.trim()) === anioNacimiento,
  )

  if (categoriaPorAnio) {
    return {
      ok: true as const,
      categoria: categoriaPorAnio,
      edadDeportiva,
      anioNacimiento,
      anioActual,
      asignacion: 'anio_nacimiento' as const,
    }
  }

  // Categorías determinadas por rango de edad deportiva.
  const categoriaPorEdad = categorias.find((categoria) => {
    const desde = categoria.edadDesde
    const hasta = categoria.edadHasta

    if (desde == null && hasta == null) return false

    if (desde != null && edadDeportiva < desde) return false
    if (hasta != null && edadDeportiva > hasta) return false

    return true
  })

  if (categoriaPorEdad) {
    return {
      ok: true as const,
      categoria: categoriaPorEdad,
      edadDeportiva,
      anioNacimiento,
      anioActual,
      asignacion: 'rango_edad' as const,
    }
  }

  return {
    ok: false as const,
    error: `No se encontró una categoría automática para ${disciplina.nombre} en ${anioActual}`,
    edadDeportiva,
    anioNacimiento,
    anioActual,
  }
}

export const determinarCategoriaParaPersona = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      personaId: number
      disciplinaId: number
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()

    const [persona] = await db
      .select({
        id: people.id,
        birthDate: people.birthDate,
      })
      .from(people)
      .where(eq(people.id, data.personaId))
      .limit(1)

    if (!persona) {
      return {
        ok: false as const,
        error: 'No se encontró la persona',
      }
    }

    if (!persona.birthDate) {
      return {
        ok: false as const,
        error: 'La persona no tiene fecha de nacimiento cargada',
      }
    }

    return resolverCategoriaDeportiva(
      data.disciplinaId,
      String(persona.birthDate),
    )
  })



export const previsualizarCategoriaDeportiva = createServerFn({
  method: 'GET',
})
  .inputValidator(
    (data: {
      disciplinaId: number
      birthDate: string
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()

    return resolverCategoriaDeportiva(
      data.disciplinaId,
      data.birthDate,
    )
  })
