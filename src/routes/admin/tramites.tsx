import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  listarSolicitudesAdmin,
  rechazarSolicitud,
  aprobarSolicitud,
} from '../../server/solicitudes.functions'

export const Route = createFileRoute('/admin/tramites')({
  component: TramitesAdminPage,
})

function TramitesAdminPage() {
  const [estado, setEstado] = useState('pendiente')
  const [tipo, setTipo] = useState('')
  const [lista, setLista] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [detalle, setDetalle] = useState<any | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [notasAdmin, setNotasAdmin] = useState('')
  const [fechaBaja, setFechaBaja] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  async function cargar() {
    setLoading(true)
    setError('')
    try {
      const res = await listarSolicitudesAdmin({
        data: {
          estado: estado || undefined,
          tipo: tipo || undefined,
          limit: 150,
        },
      })
      if (res.ok) setLista(res.solicitudes)
      else setError('No se pudieron cargar los trámites')
    } catch (e) {
      console.error(e)
      setError('Error al cargar trámites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [estado, tipo])

  async function handleRechazar() {
    if (!detalle) return
    if (motivoRechazo.trim().length < 3) {
      setError('Indicá un motivo de rechazo')
      return
    }
    if (!confirm(`¿Rechazar trámite #${detalle.id}?`)) return
    setTrabajando(true)
    setError('')
    setMsg('')
    try {
      const res = await rechazarSolicitud({
        data: { id: detalle.id, motivo: motivoRechazo },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg('Trámite rechazado')
        setDetalle(null)
        setMotivoRechazo('')
        await cargar()
      }
    } catch (e) {
      console.error(e)
      setError('Error al rechazar')
    } finally {
      setTrabajando(false)
    }
  }

  async function handleAprobar() {
    if (!detalle) return
    if (!confirm(`¿Aprobar trámite #${detalle.id}?`)) return
    setTrabajando(true)
    setError('')
    setMsg('')
    try {
      const res = await aprobarSolicitud({
        data: {
          id: detalle.id,
          notasAdmin: notasAdmin || undefined,
          fechaBaja:
            detalle.tipo === 'baja' && fechaBaja ? fechaBaja : undefined,
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg(res.mensaje)
        setDetalle(null)
        setNotasAdmin('')
        setFechaBaja('')
        await cargar()
      }
    } catch (e) {
      console.error(e)
      setError('Error al aprobar')
    } finally {
      setTrabajando(false)
    }
  }

  const labelTipo = (t: string) =>
    t === 'alta'
      ? 'Alta'
      : t === 'debito_automatico'
        ? 'Débito automático'
        : t === 'baja'
          ? 'Baja'
          : t

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Trámites</h2>
        <p className="text-sm text-gray-500">
          Solicitudes de alta, débito automático y baja enviadas desde la web
          pública.
        </p>
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

      <div className="flex flex-wrap gap-3 items-end bg-white border rounded-xl p-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="">Todos</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Todos</option>
            <option value="alta">Alta</option>
            <option value="debito_automatico">Débito automático</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg"
        >
          Actualizar
        </button>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando...</p>
        ) : lista.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            No hay trámites con ese filtro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-600">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Persona</th>
                  <th className="px-3 py-2">DNI</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2">{s.id}</td>
                    <td className="px-3 py-2">{labelTipo(s.tipo)}</td>
                    <td className="px-3 py-2">
                      {s.lastName}, {s.firstName}
                    </td>
                    <td className="px-3 py-2">{s.documentNumber}</td>
                    <td className="px-3 py-2">{s.estado}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {s.createdAt
                        ? String(s.createdAt).slice(0, 16).replace('T', ' ')
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-blue-600 text-xs hover:underline"
                        onClick={() => {
                          setDetalle(s)
                          setMotivoRechazo('')
                          setNotasAdmin('')
                          setFechaBaja('')
                          setError('')
                        }}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setDetalle(null)}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg">
                Trámite #{detalle.id} · {labelTipo(detalle.tipo)}
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500"
                onClick={() => setDetalle(null)}
              >
                Cerrar
              </button>
            </div>

            <div className="text-sm space-y-1">
              <p>
                <strong>
                  {detalle.lastName}, {detalle.firstName}
                </strong>
              </p>
              <p>DNI: {detalle.documentNumber}</p>
              {detalle.birthDate && <p>Nacimiento: {detalle.birthDate}</p>}
              {detalle.phone && <p>Celular: {detalle.phone}</p>}
              {detalle.email && <p>Email: {detalle.email}</p>}
              {detalle.domicilioCalle && (
                <p>Domicilio: {detalle.domicilioCalle}</p>
              )}
              {detalle.esDeportista && <p>Deportista: sí</p>}
              {detalle.formaPago && <p>Forma de pago: {detalle.formaPago}</p>}
              {detalle.motivoBaja && <p>Motivo baja: {detalle.motivoBaja}</p>}
              {detalle.observacionSolicitante && (
                <p>Obs.: {detalle.observacionSolicitante}</p>
              )}
              {detalle.motivoRechazo && (
                <p className="text-red-700">
                  Rechazo: {detalle.motivoRechazo}
                </p>
              )}
              <p className="text-xs text-gray-500">Estado: {detalle.estado}</p>
            </div>

            {detalle.estado === 'pendiente' && (
              <div className="border-t pt-3 space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Notas internas (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={notasAdmin}
                    onChange={(e) => setNotasAdmin(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {detalle.tipo === 'baja' && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Fecha de baja (opcional, por defecto hoy)
                    </label>
                    <input
                      type="date"
                      value={fechaBaja}
                      onChange={(e) => setFechaBaja(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={trabajando}
                    onClick={() => void handleAprobar()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm px-4 py-2 rounded-lg"
                  >
                    {trabajando ? 'Procesando...' : 'Aprobar trámite'}
                  </button>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <label className="block text-xs text-gray-600">
                    Motivo de rechazo
                  </label>
                  <textarea
                    rows={2}
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={trabajando}
                    onClick={() => void handleRechazar()}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm px-4 py-2 rounded-lg"
                  >
                    {trabajando ? 'Procesando...' : 'Rechazar trámite'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}