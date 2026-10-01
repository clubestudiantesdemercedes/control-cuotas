import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { consultarPagosPorDni } from '../server/pagos-consulta.functions'

export const Route = createFileRoute('/consulta-pagos')({
  component: ConsultaPagosPage,
})

function ConsultaPagosPage() {
  const [dni, setDni] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<any>(null)

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResultado(null)
    try {
      const res = await consultarPagosPorDni({ data: { dni } })
      if (!res.ok) setError(res.error)
      else setResultado(res)
    } catch (err) {
      console.error(err)
      setError('Error al consultar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-blue-800 text-white py-4 shadow">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Consulta de pagos</h1>
            <p className="text-blue-100 text-sm">Club Estudiantes — Cuotas 2026</p>
          </div>
          <Link
            to="/login"
            className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <p className="text-sm text-gray-600 mb-4">
            Ingresá tu DNI para ver los <strong>pagos registrados</strong> en el
            sistema. Esta consulta no indica deudas ni saldos pendientes.
          </p>

          <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Número de documento"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading || !dni.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              {loading ? 'Buscando…' : 'Consultar'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          {resultado && (
            <div className="mt-6 border-t pt-4 space-y-4">
              <div>
                <p className="font-semibold text-lg text-gray-800">{resultado.nombre}</p>
                <p className="text-sm text-gray-500">DNI {resultado.dni}</p>
              </div>

              {resultado.pagos.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {resultado.mensaje || 'No hay pagos registrados.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Período</th>
                        <th className="px-3 py-2">Fecha pago</th>
                        <th className="px-3 py-2">Importe</th>
                        <th className="px-3 py-2">Medio</th>
                        <th className="px-3 py-2">Categoría</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.pagos.map((p: any) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2 font-medium">{p.periodo}</td>
                          <td className="px-3 py-2">{p.fechaPago}</td>
                          <td className="px-3 py-2">
                            ${Number(p.importe).toLocaleString('es-AR')}
                          </td>
                          <td className="px-3 py-2">{p.formaPago || '—'}</td>
                          <td className="px-3 py-2">{p.categoria || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Solo se muestran pagos cargados en el sistema. Ante cualquier duda,
          acercate a la secretaría del club.
        </p>
      </main>
    </div>
  )
}