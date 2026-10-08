import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getAppSession } from '../lib/session.server'
import { getSessionUser } from './auth.server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    return getSessionUser()
  },
)

export const login = createServerFn({ method: 'POST' })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const username = data.username.trim().toLowerCase()
    const password = data.password

    if (!username || !password) {
      return {
        ok: false as const,
        error: 'Ingresá usuario y contraseña.',
      }
    }

    const { db } = await import('../../db')
    const { users } = await import('../../db/schema')

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (!row || !row.active) {
      return {
        ok: false as const,
        error: 'Usuario o contraseña incorrectos.',
      }
    }

    const okPass = await bcrypt.compare(password, row.passwordHash)
    if (!okPass) {
      return {
        ok: false as const,
        error: 'Usuario o contraseña incorrectos.',
      }
    }

    const session = await getAppSession()
    await session.update({
      user: {
        userId: row.id,
        username: row.username,
        fullName: row.fullName,
        role: row.role,
        permissions: (row.permissions as any) || {},
      },
    })

    return { ok: true as const }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getAppSession()
  await session.clear()
  return { ok: true as const }
})