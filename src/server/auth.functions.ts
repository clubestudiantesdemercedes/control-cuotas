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

    const ok = await bcrypt.compare(password, row.passwordHash)
    if (!ok) {
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
      },
    })

    return { ok: true as const }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getAppSession()
  await session.clear()
  return { ok: true as const }
})

/** Solo para desarrollo / primer arranque: crea admin + cargador si no existen */
export const seedUsuariosIniciales = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { db } = await import('../../db')
    const { users } = await import('../../db/schema')

    const existentes = await db.select({ id: users.id }).from(users).limit(5)
    if (existentes.length > 0) {
      return {
        ok: true as const,
        mensaje: 'Ya hay usuarios. No se crearon de nuevo.',
        creados: 0,
      }
    }

    const hashAdmin = await bcrypt.hash('estudiantes2026', 10)
    const hashCarga = await bcrypt.hash('pagos2026', 10)

    await db.insert(users).values([
      {
        username: 'admin',
        passwordHash: hashAdmin,
        fullName: 'Administrador',
        role: 'admin',
        active: true,
      },
      {
        username: 'cargador',
        passwordHash: hashCarga,
        fullName: 'Carga de pagos',
        role: 'cargador_pagos',
        active: true,
      },
    ])

    return {
      ok: true as const,
      mensaje:
        'Usuarios creados: admin / estudiantes2026 y cargador / pagos2026',
      creados: 2,
    }
  },
)