import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  listarCobradores,
  crearCobrador,
  actualizarCobrador,
} from '../../server/cobradores.functions'

export const Route = createFileRoute('/admin/cobradores')({
  component: CobradoresPage,
})

type FormState = {
  id?: number
  nombre: string
  telefono: string
  activo: boolean
}

const formVacio = (): FormState => ({
  nombre: '',
  telefono: '',
  activo: true,
})

function CobradoresPage() {
  const [lista, setLista] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<FormState>(formVacio())
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listarCobradores({ data: {} })
      if (res.ok) setLista(res.cobradores)
      else setError('No se pudieron cargar los cobradores')
    } catch (e) {
      console.error(e)
      setError('Error al cargar cobradores')
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

  const abrirEditar = (c: any) => {
    setForm({
      id: c.id,
      nombre: c.nombre || '',
      telefono: c.telefono || '',
      activo: !!c.activo,
    })
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMsg('')
    setGuardando(true)
    try {
      if (form.id) {
        const res = await actualizarCobrador({
          data: {
            id: form.id,
            nombre: form.nombre,
            telefono: form.telefono || undefined,
            activo: form.activo,
          },
        })
        if (!res.ok) setError(res.error)
        else {
          setMsg('Cobrador actualizado')
          setModalAbierto(false)
          await cargar()
        }
      } else {
        const res = await crearCobrador({
          data: {
            nombre: form.nombre,
            telefono: form.telefono || undefined,
            activo: form.activo,
          },
        })
        if (!res.ok) setError(res.error)
        else {
          setMsg('Cobrador creado')
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

  const handleToggle = async (c: any) => {
    setError('')
    try {
      const res = await actualizarCobrador({
        data: {
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono || undefined,
          activo: !c.activo,
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
          <h2 className="text-xl font-bold text-gray-800">Cobradores</h2>
          <p className="text-sm text-gray-500">
            Se asignan a cada persona y permiten listar cuotas por cobrador.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          + Agregar cobrador
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
            No hay cobradores. Agregá al menos uno para asignarlo a socios.
          </p>
        ) : (
          <ul className="divide-y">
            {lista.map((c) => (
              <li
                key={c.id}
                className="px-4 py-3 flex flex-wrap justify-between gap-2 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-900">{c.nombre}</p>
                  {c.telefono && (
                    <p className="text-xs text-gray-500">{c.telefono}</p>
                  )}
                </div>
                <div className="flex gap-2 items-start">
                  <span
                    className={
                      c.activo
                        ? 'text-xs text-green-700'
                        : 'text-xs text-gray-400'
                    }
                  >
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => abrirEditar(c)}
                    className="text-blue-600 text-xs hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggle(c)}
                    className="text-gray-600 text-xs hover:underline"
                  >
                    {c.activo ? 'Desactivar' : 'Activar'}
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
              {form.id ? 'Editar cobrador' : 'Nuevo cobrador'}
            </h3>
            <form onSubmit={handleGuardar} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Nombre *
                </label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, activo: e.target.checked }))
                  }
                />
                Activo
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