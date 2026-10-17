import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { requireUser } from './auth.server'

export const listarCobradores = createServerFn({ method: 'GET' })
  .inputValidator((data?: { soloActivos?: boolean }) => data ?? {})
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cobradores } = await import('../../db/schema')

    const rows = data.soloActivos
      ? await db
          .select()
          .from(cobradores)
          .where(eq(cobradores.activo, true))
          .orderBy(asc(cobradores.nombre))
      : await db.select().from(cobradores).orderBy(asc(cobradores.nombre))

    return { ok: true as const, cobradores: rows }
  })

export const crearCobrador = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { nombre: string; telefono?: string; activo?: boolean }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cobradores } = await import('../../db/schema')

    const nombre = (data.nombre || '').trim()
    if (!nombre) {
      return { ok: false as const, error: 'El nombre es obligatorio' }
    }

    const [row] = await db
      .insert(cobradores)
      .values({
        nombre,
        telefono: (data.telefono || '').trim() || null,
        activo: data.activo ?? true,
      })
      .returning({ id: cobradores.id })

    return { ok: true as const, id: row.id }
  })

export const actualizarCobrador = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      nombre: string
      telefono?: string
      activo?: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { cobradores } = await import('../../db/schema')

    const nombre = (data.nombre || '').trim()
    if (!nombre) {
      return { ok: false as const, error: 'El nombre es obligatorio' }
    }

    await db
      .update(cobradores)
      .set({
        nombre,
        telefono: (data.telefono || '').trim() || null,
        activo: data.activo ?? true,
        updatedAt: new Date(),
      })
      .where(eq(cobradores.id, data.id))

    return { ok: true as const }
  })