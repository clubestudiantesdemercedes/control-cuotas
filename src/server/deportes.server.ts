import { and, asc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { disciplinas, categoriasDeportivas, people } from '../../db/schema'

export async function listarDisciplinasDb() {
  return db.select().from(disciplinas).orderBy(asc(disciplinas.nombre))
}

export async function crearDisciplinaDb(nombre: string) {
  const [row] = await db
    .insert(disciplinas)
    .values({ nombre, activa: true })
    .returning()
  return row
}

export async function listarCategoriasPorDisciplinaDb(disciplinaId: number) {
  return db
    .select()
    .from(categoriasDeportivas)
    .where(eq(categoriasDeportivas.disciplinaId, disciplinaId))
    .orderBy(asc(categoriasDeportivas.nombre))
}

export async function crearCategoriaDeportivaDb(data: {
  disciplinaId: number
  nombre: string
  edadDesde?: number | null
  edadHasta?: number | null
  mesesCobro: number[]
}) {
  const [row] = await db
    .insert(categoriasDeportivas)
    .values({
      disciplinaId: data.disciplinaId,
      nombre: data.nombre,
      edadDesde: data.edadDesde ?? null,
      edadHasta: data.edadHasta ?? null,
      mesesCobro: data.mesesCobro,
      activa: true,
    })
    .returning()
  return row
}

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
    return { ok: false as const, error: 'No se encontró la disciplina' }
  }

  const categorias = await db
    .select()
    .from(categoriasDeportivas)
    .where(
      and(
        eq(categoriasDeportivas.disciplinaId, disciplinaId),
        eq(categoriasDeportivas.activa, true),
      ),
    )
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

export async function obtenerBirthDatePersona(personaId: number) {
  const [persona] = await db
    .select({ id: people.id, birthDate: people.birthDate })
    .from(people)
    .where(eq(people.id, personaId))
    .limit(1)
  return persona
}
export async function actualizarCategoriaDeportivaDb(data: {
  id: number
  nombre: string
  edadDesde?: number | null
  edadHasta?: number | null
  mesesCobro: number[]
  activa?: boolean
}) {
  const [row] = await db
    .update(categoriasDeportivas)
    .set({
      nombre: data.nombre,
      edadDesde: data.edadDesde ?? null,
      edadHasta: data.edadHasta ?? null,
      mesesCobro: data.mesesCobro,
      ...(data.activa != null ? { activa: data.activa } : {}),
    })
    .where(eq(categoriasDeportivas.id, data.id))
    .returning()
  return row
}