import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { buscarPorDocumentoOSocio } from '../server/consulta.functions'
import { listarLinksPublico } from '../server/links.functions'
import {
  WHATSAPP_SECRETARIA_DISPLAY,
  WHATSAPP_SECRETARIA_URL,
} from '../lib/contacto-club'

export const Route = createFileRoute('/')({
  component: PublicConsulta,
})

function PublicConsulta() {
  const [busqueda, setBusqueda] = useState('')
  const [tipoBusqueda, setTipoBusqueda] = useState<'dni' | 'socio' | 'grupo'>(
    'dni',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [links, setLinks] = useState<
    { id: number; titulo: string; url: string; categoria: string }[]
  >([])

  useEffect(() => {
    void (async () => {
      try {
        const res = await listarLinksPublico()
        if (res.ok) setLinks(res.links)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

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

  const colorEstado = (c: any) => {
    const codigo = c.estadoVisual || c.estado
    if (codigo === 'pagada') return 'text-green-600'
    if (codigo === 'mora') return 'text-red-700'
    if (codigo === 'vencida') return 'text-orange-700'
    if (codigo === 'pendiente') return 'text-amber-600'
    if (codigo === 'anulada') return 'text-gray-400'
    return 'text-gray-500'
  }

  const fondoPendiente = (c: any) => {
    const codigo = c.estadoVisual || c.estado
    if (codigo === 'mora') return 'bg-red-50/90 border-red-100'
    if (codigo === 'vencida') return 'bg-orange-50/90 border-orange-100'
    return 'bg-amber-50/90 border-amber-100'
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-b from-blue-100 to-blue-50">
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.12]"
        aria-hidden
      >
        <img
          src="/escudo.png"
          alt=""
          className="w-[500px] max-w-[80vw] object-contain"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>

      <header className="relative z-10 bg-blue-900 text-white py-4 shadow">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Consulta de Cuotas</h1>
            <p className="text-blue-100 text-sm">Club Atlético Estudiantes</p>
          </div>
          <div className="flex gap-2 text-sm flex-wrap">
            <Link
              to="/tramites"
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
            >
              Trámites
            </Link>
            <a
              href="#links"
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
            >
              Links útiles
            </a>
            <Link
              to="/login"
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white/85 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/60">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Consultá tu estado de cuenta
          </h2>

          <form onSubmit={handleBuscar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar por
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['dni', 'socio', 'grupo'] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setTipoBusqueda(tipo)}
                    className={`px-3 py-1.5 rounded text-sm border ${
                      tipoBusqueda === tipo
                        ? 'bg-blue-800 text-white border-blue-800'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {tipo === 'dni'
                      ? 'DNI'
                      : tipo === 'socio'
                        ? 'N° Socio'
                        : 'Grupo Familiar'}
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white/90"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !busqueda.trim()}
              className="w-full bg-blue-800 hover:bg-blue-900 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Buscando...' : 'Consultar'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-amber-50/95 border border-amber-200 text-amber-900 rounded-lg text-sm">
              {error}
            </div>
          )}

          {resultado && (
            <div className="mt-6 border-t pt-4 space-y-6">
              {resultado.socios.map((s: any) => (
                <div
                  key={s.id}
                  className="bg-gray-50/90 rounded-lg p-4 border border-gray-100"
                >
                  <p className="font-semibold text-lg">
                    {s.apellido}, {s.nombre}
                  </p>
                  <p className="text-sm text-gray-600">
                    N° Socio: {s.numeroSocio ?? '—'} · DNI: {s.documento}
                    {s.tipoSocioSocial ? ` · Tipo: ${s.tipoSocioSocial}` : ''}
                  </p>
                </div>
              ))}

              <div className="bg-blue-50/90 border border-blue-100 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Saldo actual (cuotas adeudadas)
                </p>
                <p className="text-2xl font-bold text-blue-950">
                  ${Number(resultado.saldo ?? 0).toLocaleString('es-AR')}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Cuotas pendientes
                </h3>
                {resultado.cuotasPendientes.length === 0 ? (
                  <p className="text-sm text-green-700">
                    No hay cuotas pendientes.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {resultado.cuotasPendientes.map((c: any) => (
                      <li
                        key={c.id}
                        className={`flex justify-between items-center border rounded px-3 py-2 text-sm ${fondoPendiente(c)}`}
                      >
                        <span>
                          {c.concepto} ({c.periodo}){' '}
                          <span className={`font-medium ${colorEstado(c)}`}>
                            ({c.estadoLabel || c.estado || 'Pendiente'})
                          </span>
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
                  Historial de cuotas (últimos 12 meses)
                </h3>
                {resultado.historialCuotas.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Sin cuotas en el período.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {resultado.historialCuotas.map((c: any) => (
                      <li
                        key={c.id}
                        className="flex justify-between items-center bg-white/90 border border-gray-200 rounded px-3 py-2 text-sm"
                      >
                        <span>
                          {c.concepto}{' '}
                          <span className={colorEstado(c)}>
                            ({c.estadoLabel || c.estado})
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
                  Pagos registrados (últimos 12 meses)
                </h3>
                {resultado.historialPagos.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Sin pagos registrados en el período.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {resultado.historialPagos.map((p: any) => (
                      <li
                        key={p.id}
                        className="bg-green-50/90 border border-green-100 rounded px-3 py-2 text-sm"
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
                              {p.periodosAplicados?.length
                                ? ` · Aplicado a: ${p.periodosAplicados.join(', ')}`
                                : ''}
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

        <section
          id="links"
          className="bg-white/85 backdrop-blur-sm rounded-xl shadow-md p-6 border border-white/60"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Links útiles
          </h2>
          {links.length === 0 ? (
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/tramites" className="text-blue-800 hover:underline">
                  Solicitar trámite / alta de socio
                </Link>
              </li>
              <li>
                <a
                  href={WHATSAPP_SECRETARIA_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-800 hover:underline"
                >
                  WhatsApp Secretaría ({WHATSAPP_SECRETARIA_DISPLAY})
                </a>
              </li>
              <p className="text-xs text-gray-500 pt-2">
                Cuando cargues links desde Configuración, aparecerán acá.
              </p>
            </ul>
          ) : (
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id}>
                  {l.url.startsWith('/') ? (
                    <Link
                      to={l.url as any}
                      className="text-blue-800 hover:underline text-sm"
                    >
                      {l.titulo}
                    </Link>
                  ) : (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-800 hover:underline text-sm"
                    >
                      {l.titulo}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-gray-600">
          Si tenés problemas para consultar, acercate a secretaría o escribinos
          por{' '}
          <a
            href={WHATSAPP_SECRETARIA_URL}
            target="_blank"
            rel="noreferrer"
            className="text-blue-800 underline"
          >
            WhatsApp {WHATSAPP_SECRETARIA_DISPLAY}
          </a>
          .
        </p>
      </main>
    </div>
  )
}