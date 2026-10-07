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
    <div className="relative min-h-screen bg-slate-100">
      {/* Marca de agua */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/fondo-consulta.jpg')",
          backgroundSize: '500px',
          opacity: 0.22,
        }}
        aria-hidden
      />

      <div className="relative z-10">
        <header className="bg-blue-950/95 text-white py-4 shadow">
          <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Consulta de pagos</h1>
              <p className="text-blue-100 text-sm">Club Atlético Estudiantes — Basquet - Cuotas 2026</p>
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
          {/* Caja semitransparente */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/50">
            <h2 className="text-lg font-semibold mb-1 text-gray-800">
              Consultá tus pagos registrados
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Ingresá tu número de documento. Se muestran únicamente los pagos
              cargados en el sistema.{' '}
              <strong>No indica deudas ni saldos pendientes.</strong>
            </p>

            {resultado?.ultimaActualizacion && (
              <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
                <strong>Pagos actualizados al {resultado.ultimaActualizacion}.</strong>{' '}
                Los pagos realizados después de esta fecha pueden no aparecer todavía en la consulta.
              </div>
            )}

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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white/90 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !dni.trim()}
                className="w-full bg-blue-800 hover:bg-blue-900 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition"
              >
                {loading ? 'Buscando...' : 'Consultar'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-amber-50/90 border border-amber-200 text-amber-800 rounded-lg text-sm">
                {error}
              </div>
            )}

            {resultado && (
              <div className="mt-6 border-t border-gray-200/80 pt-4 space-y-4">
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
                        <thead className="bg-white/50 text-left text-gray-600">
                          <tr>
                            <th className="px-3 py-2">Período</th>
                            <th className="px-3 py-2">Fecha de pago</th>
                            <th className="px-3 py-2">Importe</th>
                            <th className="px-3 py-2">Medio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.pagos.map((p: any) => (
                            <tr key={p.id} className="border-t border-gray-200/60">
                              <td className="px-3 py-2 font-medium">{p.periodo}</td>
                              <td className="px-3 py-2">{p.fechaPago}</td>
                              <td className="px-3 py-2">
                                ${Number(p.importe).toLocaleString('es-AR')}
                              </td>
                              <td className="px-3 py-2">{p.formaPago || '—'}</td>
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

          <p className="text-center text-xs text-black-700 mt-6">
            Si tenés problemas para consultar, escribinos por WhatsApp al área de básquet:{' '}
            <a
              href="https://wa.me/5492324349188"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-900 font-medium hover:underline"
            >
              Abrir chat
            </a>
          </p>
        </main>
      </div>
    </div>
  )
}