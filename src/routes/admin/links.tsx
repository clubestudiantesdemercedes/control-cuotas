import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  listarLinksAdmin,
  crearLinkUtil,
  actualizarLinkUtil,
} from '../../server/links.functions'

export const Route = createFileRoute('/admin/links')({
  component: LinksAdminPage,
})

type LinkForm = {
  id?: number
  titulo: string
  url: string
  categoria: string
  orden: string
  activo: boolean
}

const formVacio = (): LinkForm => ({
  titulo: '',
  url: '',
  categoria: 'otro',
  orden: '50',
  activo: true,
})

const CATEGORIAS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'redes', label: 'Redes sociales' },
  { value: 'ubicacion', label: 'Ubicación / Maps' },
  { value: 'tramites', label: 'Trámites' },
  { value: 'otro', label: 'Otro' },
]

function LinksAdminPage() {
  const [lista, setLista] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<LinkForm>(formVacio())
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listarLinksAdmin()
      if (res.ok) setLista(res.links)
      else setError('No se pudieron cargar los links')
    } catch (e) {
      console.error(e)
      setError('Error al cargar links')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const abrirNuevo = () => {
    setForm(formVacio())
    setModalAbierto(true)
  }

  const abrirEditar = (l: any) => {
    setForm({
      id: l.id,
      titulo: l.titulo || '',
      url: l.url || '',
      categoria: l.categoria || 'otro',
      orden: String(l.orden ?? 50),
      activo: !!l.activo,
    })
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMsg('')
    setGuardando(true)
    const payload = {
      titulo: form.titulo,
      url: form.url,
      categoria: form.categoria,
      orden: Number(form.orden) || 0,
      activo: form.activo,
    }
    try {
      if (form.id) {
        const res = await actualizarLinkUtil({
          data: { id: form.id, ...payload },
        })
        if (!res.ok) setError(res.error)
        else {
          setMsg('Link actualizado')
          setModalAbierto(false)
          await cargar()
        }
      } else {
        const res = await crearLinkUtil({ data: payload })
        if (!res.ok) setError(res.error)
        else {
          setMsg('Link creado')
          setModalAbierto(false)
          await cargar()
        }
      }
    } catch (err) {
      console.error(err)
      setError('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleToggle = async (l: any) => {
    setError('')
    try {
      const res = await actualizarLinkUtil({
        data: {
          id: l.id,
          titulo: l.titulo,
          url: l.url,
          categoria: l.categoria,
          orden: l.orden,
          activo: !l.activo,
        },
      })
      if (!res.ok) setError(res.error)
      else await cargar()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar')
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Links útiles</h2>
          <p className="text-sm text-gray-500">
            Se muestran en la consulta pública. Orden menor = más arriba.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          + Agregar link
        </button>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm">
          {error}
        </div>
      )}
      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-900 rounded-lg text-sm">
          {msg}
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando...</p>
        ) : lista.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            No hay links. Agregá WhatsApp, redes, Maps o el enlace a trámites.
          </p>
        ) : (
          <ul className="divide-y">
            {lista.map((l) => (
              <li
                key={l.id}
                className="px-4 py-3 flex flex-wrap justify-between gap-2 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{l.titulo}</p>
                  <p className="text-xs text-gray-500 break-all">{l.url}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {l.categoria} · orden {l.orden}
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <span
                    className={
                      l.activo
                        ? 'text-xs text-green-700'
                        : 'text-xs text-gray-400'
                    }
                  >
                    {l.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => abrirEditar(l)}
                    className="text-blue-600 text-xs hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggle(l)}
                    className="text-gray-600 text-xs hover:underline"
                  >
                    {l.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => !guardando && setModalAbierto(false)}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="font-semibold text-lg">
              {form.id ? 'Editar link' : 'Nuevo link'}
            </h3>
            <form onSubmit={handleGuardar} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Título *
                </label>
                <input
                  required
                  value={form.titulo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, titulo: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  URL * (https://… o /tramites)
                </label>
                <input
                  required
                  value={form.url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, url: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="https://wa.me/549..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Categoría
                  </label>
                  <select
                    value={form.categoria}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoria: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Orden
                  </label>
                  <input
                    type="number"
                    value={form.orden}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, orden: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, activo: e.target.checked }))
                  }
                />
                Activo (visible en la web pública)
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => setModalAbierto(false)}
                  className="border text-sm px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}