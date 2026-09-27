import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { disciplinas, categoriasDeportivas } from '../../db/schema'
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
      return { ok: false as const, error: 'Ingresá el nombre del deporte' }
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
      return { ok: false as const, error: 'Completá deporte y nombre de categoría' }
    }
    if (!data.mesesCobro?.length) {
      return { ok: false as const, error: 'Elegí al menos un mes de cobro' }
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
      return { ok: false as const, error: 'No se pudo crear la categoría' }
    }
  })