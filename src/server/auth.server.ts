import { redirect } from '@tanstack/react-router'
import { getAppSession, type SessionUser } from '../lib/session.server'

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getAppSession()
  return session.data.user ?? null
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    throw redirect({ to: '/login' })
  }
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'admin') {
    throw redirect({ to: '/admin' })
  }
  return user
}