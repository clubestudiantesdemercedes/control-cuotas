import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { disciplinas, categoriasDeportivas } from '../../db/schema'
import { requireUser } from './auth.server'

async function resolverCategoriaDeportiva(
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
