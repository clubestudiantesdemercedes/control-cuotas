import { useSession } from '@tanstack/react-start/server'

export type SessionUser = {
  userId: number
  username: string
  fullName: string
  role: 'admin' | 'cargador_pagos'
}

type SessionData = {
  user?: SessionUser
}

const SESSION_PASSWORD =
  process.env.SESSION_SECRET ??
  'cuotas-estudiantes-dev-secret-cambiar-en-produccion-32c'

export function getAppSession() {
  return useSession<SessionData>({
    password: SESSION_PASSWORD,
    name: 'cuotas_session',
    cookie: { sameSite: 'lax' },
  })
}