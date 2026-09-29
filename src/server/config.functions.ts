import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { clubConfig } from '../../db/schema'
import { requireUser, requireAdmin } from './auth.server'

export const getProximoNumeroSocio = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const rows = await db
      .select()
      .from(clubConfig)
      .where(eq(clubConfig.key, 'ultimo_numero_socio'))
      .limit(1)

    const ultimo = rows[0] ? Number(rows[0].value) || 0 : 0
    return { ok: true as const, proximo: ultimo + 1, ultimo }
  },
)

export const setUltimoNumeroSocio = createServerFn({ method: 'POST' })
  .inputValidator((data: { ultimo: number }) => data)
  .handler(async ({ data }) => {
    await requireAdmin()
    if (!Number.isFinite(data.ultimo) || data.ultimo < 0) {
      return { ok: false as const, error: 'Número inválido' }
    }
    await db
      .insert(clubConfig)
      .values({
        key: 'ultimo_numero_socio',
        value: String(Math.floor(data.ultimo)),
      })
      .onConflictDoUpdate({
        target: clubConfig.key,
        set: {
          value: String(Math.floor(data.ultimo)),
          updatedAt: new Date(),
        },
      })
    return { ok: true as const, ultimo: Math.floor(data.ultimo) }
  })