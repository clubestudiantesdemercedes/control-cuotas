import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { getCurrentUser, logout } from '../server/auth.functions'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
  component: AdminLayout,
})

const menu = [
  { to: '/admin', label: 'Inicio', exact: true },
  { to: '/admin/personas', label: 'Personas' },
  { to: '/admin/deportes', label: 'Deportes' },
  { to: '/admin/cuotas', label: 'Cuotas' },
  { to: '/admin/pagos', label: 'Pagos' },
  { to: '/admin/tarifario', label: 'Tarifario' },
  { to: '/admin/configuracion', label: 'Configuración' },
] as const

function AdminLayout() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const handleLogout = async () => {
    await logout()
    await router.navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-bold text-sm md:text-base">Control de cuotas</h1>
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

      <div className="flex flex-1 min-h-0">
        <aside className="w-48 bg-white border-r border-gray-200 p-3 shrink-0">
          <nav className="space-y-1">
            {menu.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block px-3 py-2 rounded-lg text-sm ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}