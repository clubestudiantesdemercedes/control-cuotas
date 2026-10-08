import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { requireAdmin, requireUser } from './auth.server'
import {
  MODULOS,
  plantillaCargadorPagos,
  permisosVacios,
  type PermisosMap,
} from '../lib/permisos'

function normalizarPermisos(input: unknown): PermisosMap {
  const base = permisosVacios()
  if (!input || typeof input !== 'object') return base
  const src = input as PermisosMap
  for (const m of MODULOS) {
    for (const a of m.acciones) {
      if (src[m.key]?.[a.key] === true) base[m.key][a.key] = true
    }
  }
  return base
}

export const listarUsuarios = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAdmin()
    const { db } = await import('../../db')
    const { users } = await import('../../db/schema')

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        active: users.active,
        permissions: users.permissions,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.username))

    return {
      ok: true as const,
      usuarios: rows,
      modulos: MODULOS,
    }
  },
)

export const crearUsuario = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      username: string
      password: string
      fullName: string
      role: string
      permissions?: PermisosMap
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const { db } = await import('../../db')
    const { users } = await import('../../db/schema')

    const username = data.username.trim().toLowerCase()
    const fullName = data.fullName.trim()
    const password = data.password
    const role = data.role === 'admin' ? 'admin' : 'usuario'

    if (!username || username.length < 3) {
      return { ok: false as const, error: 'Usuario inválido (mín. 3 caracteres)' }
    }
    if (!fullName) {
      return { ok: false as const, error: 'Nombre completo obligatorio' }
    }
    if (!password || password.length < 6) {
      return {
        ok: false as const,
        error: 'Contraseña de al menos 6 caracteres',
      }
    }

    const permissions =
      role === 'admin'
        ? {}
        : normalizarPermisos(data.permissions ?? plantillaCargadorPagos())

    const passwordHash = await bcrypt.hash(password, 10)

    try {
      const [row] = await db
        .insert(users)
        .values({
          username,
          passwordHash,
          fullName,
          role,
          active: true,
          permissions,
        } as any)
        .returning({ id: users.id })

      return { ok: true as const, id: row.id }
    } catch (err: any) {
      console.error(err)
      if (String(err?.message || err).includes('unique')) {
        return { ok: false as const, error: 'Ese nombre de usuario ya existe' }
      }
      return { ok: false as const, error: 'No se pudo crear el usuario' }
    }
  })

export const actualizarUsuario = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      fullName?: string
      role?: string
      active?: boolean
      password?: string
      permissions?: PermisosMap
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const { db } = await import('../../db')
    const { users } = await import('../../db/schema')

    const patch: Record<string, unknown> = {}

    if (data.fullName != null) {
      const n = data.fullName.trim()
      if (!n) return { ok: false as const, error: 'Nombre inválido' }
      patch.fullName = n
    }
    if (data.role != null) {
      patch.role = data.role === 'admin' ? 'admin' : 'usuario'
    }
    if (data.active != null) patch.active = data.active
    if (data.password != null && data.password.length > 0) {
      if (data.password.length < 6) {
        return {
          ok: false as const,
          error: 'Contraseña de al menos 6 caracteres',
        }
      }
      patch.passwordHash = await bcrypt.hash(data.password, 10)
    }
    if (data.permissions != null) {
      patch.permissions = normalizarPermisos(data.permissions)
    }

    if (Object.keys(patch).length === 0) {
      return { ok: false as const, error: 'Nada para actualizar' }
    }

    await db.update(users).set(patch).where(eq(users.id, data.id))
    return { ok: true as const }
  })

/** Para el cliente: permisos del usuario logueado */
export const getMisPermisos = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    return {
      ok: true as const,
      role: user.role,
      permissions: user.permissions || {},
      esAdmin: user.role === 'admin',
    }
  },
)