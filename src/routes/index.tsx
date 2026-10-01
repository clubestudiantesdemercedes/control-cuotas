import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { consultarPagosPorDni } from '../server/pagos-consulta.functions'

export const Route = createFileRoute('/')({
  component: PublicConsulta,
})

function PublicConsulta() {
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
      <header className="bg-blue-950 text-white py-4 shadow">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Consulta de pagos</h1>
            <p className="text-blue-100 text-sm">Club Estudiantes — Cuotas 2026</p>
          </div>
          <Link
            to="/login"
            className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-1 text-gray-800">
            Consultá tus pagos registrados
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Ingresá tu número de documento. Se muestran únicamente los pagos
            cargados en el sistema. <strong>No indica deudas ni saldos pendientes.</strong>
          </p>

          <form onSubmit={handleBuscar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DNI
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ingresá tu número de documento"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !dni.trim()}
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
            <div className="mt-6 border-t pt-4 space-y-4">
              <div>
                <p className="font-semibold text-lg text-gray-800">{resultado.nombre}</p>
                <p className="text-sm text-gray-500">DNI {resultado.dni}</p>
              </div>

              {resultado.pagos.length === 0 ? (
                <p className="text-sm text-gray-600">
                  {resultado.mensaje || 'No hay pagos registrados para este DNI.'}
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    {resultado.pagos.length} pago
                    {resultado.pagos.length === 1 ? '' : 's'} registrado
                    {resultado.pagos.length === 1 ? '' : 's'}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                          <th className="px-3 py-2">Período</th>
                          <th className="px-3 py-2">Fecha de pago</th>
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
                </>
              )}
            </div>
          )}
        </div>

                <p className="text-center text-xs text-gray-500 mt-6">
          Si tenés problemas para consultar, escribinos al WhatsApp de básquet:{' '}
          <a
            href="https://wa.me/5492324349188"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-800 font-medium hover:underline"
          >
            Abrir chat
          </a>
        </p>
      </main>
    </div>
  )
}