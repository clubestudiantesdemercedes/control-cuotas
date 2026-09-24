import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { getCurrentUser, logout } from '../server/auth.functions'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
  component: AdminPage,
})

function AdminPage() {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    await router.navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold">Panel de administración</h1>
          <p className="text-xs text-blue-200">
            {user.fullName} · {user.role}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <Link to="/" className="text-sm text-blue-200 hover:text-white">
            Consulta pública
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-700 mb-4">
          Sesión iniciada correctamente. Desde acá vamos a ir agregando:
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm">
          <li>Personas y membresías</li>
          <li>Generación de cuotas</li>
          <li>Carga de pagos</li>
          <li>Tarifario y medios de pago</li>
        </ul>
      </main>
    </div>
  )
}