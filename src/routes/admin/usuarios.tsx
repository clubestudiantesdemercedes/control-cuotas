import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '../../server/auth.functions'
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
} from '../../server/users.functions'
import {
  MODULOS,
  plantillaCargadorPagos,
  permisosVacios,
  type PermisosMap,
} from '../../lib/permisos'

export const Route = createFileRoute('/admin/usuarios')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    if (user.role !== 'admin') throw redirect({ to: '/admin' })
    return { user }
  },
  component: UsuariosPage,
})

function MatrizPermisos({
  value,
  onChange,
  disabled,
}: {
  value: PermisosMap
  onChange: (v: PermisosMap) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
      {MODULOS.map((m) => (
        <div key={m.key}>
          <p className="text-sm font-medium text-gray-800 mb-1">{m.label}</p>
          <div className="flex flex-wrap gap-3">
            {m.acciones.map((a) => (
              <label
                key={a.key}
                className="flex items-center gap-1.5 text-xs text-gray-700"
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={Boolean(value[m.key]?.[a.key])}
                  onChange={(e) => {
                    onChange({
                      ...value,
                      [m.key]: {
                        ...(value[m.key] || {}),
                        [a.key]: e.target.checked,
                      },
                    })
                  }}
                />
                {a.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [esAdmin, setEsAdmin] = useState(false)
  const [permissions, setPermissions] = useState<PermisosMap>(() =>
    plantillaCargadorPagos(),
  )
  const [saving, setSaving] = useState(false)

  const [editPermId, setEditPermId] = useState<number | null>(null)
  const [editPerms, setEditPerms] = useState<PermisosMap>(permisosVacios())

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listarUsuarios()
      if (!res.ok) {
        setError('No se pudieron cargar los usuarios')
        return
      }
      setUsuarios(res.usuarios || [])
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMsg('')
    try {
      const res = await crearUsuario({
        data: {
          username,
          password,
          fullName,
          role: esAdmin ? 'admin' : 'usuario',
          permissions: esAdmin ? {} : permissions,
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg('Usuario creado')
        setUsername('')
        setFullName('')
        setPassword('')
        setEsAdmin(false)
        setPermissions(plantillaCargadorPagos())
        await cargar()
      }
    } catch (err) {
      console.error(err)
      setError('Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (u: any) => {
    setError('')
    setMsg('')
    try {
      const res = await actualizarUsuario({
        data: { id: u.id, active: !u.active },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg(u.active ? 'Usuario desactivado' : 'Usuario activado')
        await cargar()
      }
    } catch (err) {
      console.error(err)
      setError('Error al actualizar')
    }
  }

  const handleResetPass = async (u: any) => {
    const nueva = prompt(`Nueva contraseña para ${u.username}:`)
    if (!nueva) return
    setError('')
    setMsg('')
    try {
      const res = await actualizarUsuario({
        data: { id: u.id, password: nueva },
      })
      if (!res.ok) setError(res.error)
      else setMsg(`Contraseña de ${u.username} actualizada`)
    } catch (err) {
      console.error(err)
      setError('Error al cambiar contraseña')
    }
  }

  const abrirPermisos = (u: any) => {
    const base = permisosVacios()
    const src = (u.permissions || {}) as PermisosMap
    for (const m of MODULOS) {
      for (const a of m.acciones) {
        if (src[m.key]?.[a.key]) base[m.key][a.key] = true
      }
    }
    setEditPermId(u.id)
    setEditPerms(base)
  }

  const guardarPermisos = async () => {
    if (editPermId == null) return
    setError('')
    setMsg('')
    try {
      const res = await actualizarUsuario({
        data: { id: editPermId, permissions: editPerms, role: 'usuario' },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg('Permisos actualizados (el usuario debe volver a iniciar sesión)')
        setEditPermId(null)
        await cargar()
      }
    } catch (err) {
      console.error(err)
      setError('Error al guardar permisos')
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Usuarios</h2>
        <p className="text-sm text-gray-500">
          Admin = acceso total. El resto se configura con casillas por módulo.
        </p>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {msg}
        </div>
      )}
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-800">Nuevo usuario</h3>
        <form onSubmit={handleCrear} className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Usuario</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Nombre completo
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={esAdmin}
                  onChange={(e) => setEsAdmin(e.target.checked)}
                />
                Es administrador (acceso total)
              </label>
            </div>
          </div>

          {!esAdmin && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Permisos</p>
              <MatrizPermisos value={permissions} onChange={setPermissions} />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
          >
            {saving ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{u.username}</td>
                  <td className="px-3 py-2">{u.fullName}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">
                    {u.active ? (
                      <span className="text-green-700">Activo</span>
                    ) : (
                      <span className="text-gray-400">Inactivo</span>
                    )}
                  </td>
                  <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                    {u.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => abrirPermisos(u)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Permisos
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleToggle(u)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {u.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResetPass(u)}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Clave
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editPermId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3">
            <h3 className="font-bold text-gray-800">Editar permisos</h3>
            <MatrizPermisos value={editPerms} onChange={setEditPerms} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void guardarPermisos()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditPermId(null)}
                className="border px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}