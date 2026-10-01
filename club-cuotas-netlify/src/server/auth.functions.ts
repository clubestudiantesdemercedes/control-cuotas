import { createServerFn } from '@tanstack/react-start'
import { getAppSession } from '../lib/session.server'
import { getSessionUser } from './auth.server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  return getSessionUser()
})

export const login = createServerFn({ method: 'POST' })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const username = data.username.trim().toLowerCase()
    const password = data.password

    // Usuario de prueba (sin DB) — igual que en el natatorio
    if (username === 'admin' && password === 'estudiantes2026') {
      const session = await getAppSession()
      await session.update({
        user: {
          userId: 1,
          username: 'admin',
          fullName: 'Administrador',
          role: 'admin',
        },
      })
      return { ok: true as const }
    }

    // Más adelante: validar contra tabla users + bcrypt
    return {
      ok: false as const,
      error: 'Usuario o contraseña incorrectos.',
    }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getAppSession()
  await session.clear()
  return { ok: true as const }
})