import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { login, getCurrentUser } from '../server/auth.functions'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (user) {
      throw redirect({ to: '/admin' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login({ data: { username, password } })
      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }
      await router.navigate({ to: '/admin' })
    } catch {
      setError('No se pudo iniciar sesión. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-6">
        <h1 className="text-xl font-bold text-gray-800 text-center mb-1">
          Administración
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Control de cuotas – Club Estudiantes
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Demo: usuario <strong>admin</strong> / clave <strong>estudiantes2026</strong>
        </p>

        <p className="text-center text-xs text-gray-500 mt-3">
          <Link to="/" className="text-blue-600 hover:underline">
            ← Volver a la consulta pública
          </Link>
        </p>
      </div>
    </div>
  )
}