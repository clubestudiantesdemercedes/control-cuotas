import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { requireUser } from './auth.server'

export const listarLinksPublico = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { db } = await import('../../db')
    const { linksUtiles } = await import('../../db/schema')
    const rows = await db
      .select({
        id: linksUtiles.id,
        titulo: linksUtiles.titulo,
        url: linksUtiles.url,
        categoria: linksUtiles.categoria,
        orden: linksUtiles.orden,
      })
      .from(linksUtiles)
      .where(eq(linksUtiles.activo, true))
      .orderBy(asc(linksUtiles.orden), asc(linksUtiles.id))
    return { ok: true as const, links: rows }
  },
)

export const listarLinksAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const { db } = await import('../../db')
    const { linksUtiles } = await import('../../db/schema')
    const rows = await db
      .select()
      .from(linksUtiles)
      .orderBy(asc(linksUtiles.orden), asc(linksUtiles.id))
    return { ok: true as const, links: rows }
  },
)

type LinkInput = {
  titulo: string
  url: string
  categoria?: string
  orden?: number
  activo?: boolean
}

export const crearLinkUtil = createServerFn({ method: 'POST' })
  .inputValidator((data: LinkInput) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { linksUtiles } = await import('../../db/schema')

    const titulo = (data.titulo || '').trim()
    const url = (data.url || '').trim()
    if (!titulo || !url) {
      return { ok: false as const, error: 'Título y URL son obligatorios' }
    }

    const [row] = await db
      .insert(linksUtiles)
      .values({
        titulo,
        url,
        categoria: (data.categoria || 'otro').trim() || 'otro',
        orden: data.orden ?? 0,
        activo: data.activo ?? true,
      })
      .returning({ id: linksUtiles.id })

    return { ok: true as const, id: row.id }
  })

export const actualizarLinkUtil = createServerFn({ method: 'POST' })
  .inputValidator((data: LinkInput & { id: number }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { linksUtiles } = await import('../../db/schema')

    const titulo = (data.titulo || '').trim()
    const url = (data.url || '').trim()
    if (!titulo || !url) {
      return { ok: false as const, error: 'Título y URL son obligatorios' }
    }

    await db
      .update(linksUtiles)
      .set({
        titulo,
        url,
        categoria: (data.categoria || 'otro').trim() || 'otro',
        orden: data.orden ?? 0,
        activo: data.activo ?? true,
        updatedAt: new Date(),
      })
      .where(eq(linksUtiles.id, data.id))

    return { ok: true as const }
  })