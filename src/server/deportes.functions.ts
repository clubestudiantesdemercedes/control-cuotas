import { createServerFn } from '@tanstack/react-start'
import { requireUser } from './auth.server'

export const listarDisciplinas = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const { listarDisciplinasDb } = await import('./deportes.server')
    const rows = await listarDisciplinasDb()
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
      const { crearDisciplinaDb } = await import('./deportes.server')
      const row = await crearDisciplinaDb(nombre)
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
    const { listarCategoriasPorDisciplinaDb } = await import('./deportes.server')
    const rows = await listarCategoriasPorDisciplinaDb(data.disciplinaId)
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
      return {
        ok: false as const,
        error: 'Completá deporte y nombre de categoría',
      }
    }
    if (!data.mesesCobro?.length) {
      return { ok: false as const, error: 'Elegí al menos un mes de cobro' }
    }
    try {
      const { crearCategoriaDeportivaDb } = await import('./deportes.server')
      const row = await crearCategoriaDeportivaDb({
        disciplinaId: data.disciplinaId,
        nombre,
        edadDesde: data.edadDesde,
        edadHasta: data.edadHasta,
        mesesCobro: data.mesesCobro,
      })
      return { ok: true as const, categoria: row }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'No se pudo crear la categoría' }
    }
  })

export const previsualizarCategoriaDeportiva = createServerFn({
  method: 'GET',
})
  .inputValidator((data: { disciplinaId: number; birthDate: string }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { resolverCategoriaDeportiva } = await import('./deportes.server')
    return resolverCategoriaDeportiva(data.disciplinaId, data.birthDate)
  })

export const determinarCategoriaParaPersona = createServerFn({ method: 'GET' })
  .inputValidator((data: { personaId: number; disciplinaId: number }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { obtenerBirthDatePersona, resolverCategoriaDeportiva } =
      await import('./deportes.server')
    const persona = await obtenerBirthDatePersona(data.personaId)
    if (!persona) {
      return { ok: false as const, error: 'No se encontró la persona' }
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

  export const actualizarCategoriaDeportiva = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      nombre: string
      edadDesde?: number | null
      edadHasta?: number | null
      mesesCobro: number[]
      activa?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const nombre = data.nombre.trim()
    if (!nombre || !data.id) {
      return { ok: false as const, error: 'Completá los datos de la categoría' }
    }
    if (!data.mesesCobro?.length) {
      return { ok: false as const, error: 'Elegí al menos un mes de cobro' }
    }
    try {
      const { actualizarCategoriaDeportivaDb } = await import('./deportes.server')
      const row = await actualizarCategoriaDeportivaDb({
        id: data.id,
        nombre,
        edadDesde: data.edadDesde,
        edadHasta: data.edadHasta,
        mesesCobro: data.mesesCobro,
        activa: data.activa,
      })
      if (!row) {
        return { ok: false as const, error: 'Categoría no encontrada' }
      }
      return { ok: true as const, categoria: row }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'No se pudo actualizar la categoría' }
    }
  })