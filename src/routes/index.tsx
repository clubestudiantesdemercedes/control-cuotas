import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { buscarPorDocumentoOSocio } from '../server/consulta.functions'

export const Route = createFileRoute('/')({
  component: PublicConsulta,
})

function PublicConsulta() {
  const [busqueda, setBusqueda] = useState('')
  const [tipoBusqueda, setTipoBusqueda] = useState<'dni' | 'socio' | 'grupo'>('dni')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<any>(null)

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!busqueda.trim()) return

    setLoading(true)
    setError('')
    setResultado(null)

    try {
      const res = await buscarPorDocumentoOSocio({
        data: { valor: busqueda, tipo: tipoBusqueda },
      })

      if (!res.ok) {
        setError(res.error)
      } else {
        setResultado(res)
      }
    } catch (err) {
      console.error(err)
      setError('Error al consultar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-blue-800 text-white py-6 shadow">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-2xl md:text-3xl font-bold">Consulta de Cuotas</h1>
          <p className="mt-1 text-blue-100 text-sm">Club Social y Deportivo</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Consultá tu estado de cuenta
          </h2>

          <form onSubmit={handleBuscar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar por
              </label>
              <div className="flex gap-2">
                {(['dni', 'socio', 'grupo'] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoBusqueda(tipo)}
                    className={`px-3 py-1.5 rounded text-sm border ${
                      tipoBusqueda === tipo
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {tipo === 'dni' ? 'DNI' : tipo === 'socio' ? 'N° Socio' : 'Grupo Familiar'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={
                  tipoBusqueda === 'dni'
                    ? 'Ingresá tu número de documento'
                    : tipoBusqueda === 'socio'
                      ? 'Ingresá tu número de socio'
                      : 'Ingresá el ID del grupo familiar'
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !busqueda.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Buscando...' : 'Consultar'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          {resultado && (
            <div className="mt-6 border-t pt-4 space-y-6">
              {resultado.socios.map((s: any) => (
                <div key={s.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold text-lg">
                    {s.apellido}, {s.nombre}
                  </p>
                  <p className="text-sm text-gray-600">
                    N° Socio: {s.numeroSocio} · DNI: {s.documento} · Tipo: {s.tipoSocioSocial}
                  </p>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-sm text-blue-800">Saldo actual (cuotas adeudadas)</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${Number(resultado.saldo ?? 0).toLocaleString('es-AR')}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Cuotas pendientes</h3>
                {resultado.cuotasPendientes.length === 0 ? (
                  <p className="text-sm text-green-700">No hay cuotas pendientes.</p>
                ) : (
                  <ul className="space-y-2">
                    {resultado.cuotasPendientes.map((c: any) => (
                      <li
                        key={c.id}
                        className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded px-3 py-2 text-sm"
                      >
                        <span>
                          {c.concepto} ({c.periodo})
                        </span>
                        <span className="font-semibold">
                          ${Number(c.montoFinal).toLocaleString('es-AR')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Historial de cuotas (últimos 6 meses)
                </h3>
                {resultado.historialCuotas.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin cuotas en el período.</p>
                ) : (
                  <ul className="space-y-2">
                    {resultado.historialCuotas.map((c: any) => (
                      <li
                        key={c.id}
                        className="flex justify-between items-center bg-white border border-gray-200 rounded px-3 py-2 text-sm"
                      >
                        <span>
                          {c.concepto}{' '}
                          <span
                            className={
                              c.estado === 'pagada'
                                ? 'text-green-600'
                                : c.estado === 'pendiente'
                                  ? 'text-amber-600'
                                  : 'text-gray-500'
                            }
                          >
                            ({c.estado})
                          </span>
                        </span>
                        <span className="font-medium">
                          ${Number(c.montoFinal).toLocaleString('es-AR')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Pagos registrados (últimos 6 meses)
                </h3>
                {resultado.historialPagos.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin pagos registrados en el período.</p>
                ) : (
                  <ul className="space-y-2">
                    {resultado.historialPagos.map((p: any) => (
                      <li
                        key={p.id}
                        className="bg-green-50 border border-green-100 rounded px-3 py-2 text-sm"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium">
                              {p.fechaPago}
                              {p.periodo ? ` · Período ${p.periodo}` : ''}
                            </p>
                            <p className="text-gray-600 text-xs mt-0.5">
                              {p.medioNombre || 'Sin medio'}
                              {p.referencia ? ` · Ref: ${p.referencia}` : ''}
                            </p>
                          </div>
                          <span className="font-semibold text-green-700 whitespace-nowrap">
                            ${Number(p.montoTotal).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Si tenés problemas para consultar, acercate a la secretaría del club.
        </p>
      </main>
    </div>
  )
}