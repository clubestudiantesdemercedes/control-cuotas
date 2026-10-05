import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CLAVES_TARIFA } from '../../lib/tarifario-claves'
import {
  crearNuevaVigencia,
  listarTarifario,
  seedTarifarioInicial,
} from '../../server/tarifario.functions'

export const Route = createFileRoute('/admin/tarifario')({
  component: TarifarioPage,
})

function TarifarioPage() {
  const [vigentes, setVigentes] = useState<any[]>([])
  const [todas, setTodas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [periodo, setPeriodo] = useState('2026-01')
  const [montos, setMontos] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const c of CLAVES_TARIFA) init[c.clave] = c.montoDefault
    return init
  })
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listarTarifario()
      if (res.ok) {
        setVigentes(res.vigentes)
        setTodas(res.todas)
        if (res.vigentes.length) {
          const next: Record<string, string> = { ...montos }
          for (const r of res.vigentes) {
            if (r.tipoSocioSocial) next[r.tipoSocioSocial] = String(r.monto)
          }
          setMontos(next)
        }
      }
    } catch (e) {
      console.error(e)
      setError('Error al cargar tarifario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const handleSeed = async () => {
    setError('')
    setMsg('')
    setGuardando(true)
    try {
      const res = await seedTarifarioInicial({ data: { vigenciaDesde: periodo } })
      if (!res.ok) setError(res.error)
      else {
        setMsg(`Carga inicial OK (${res.cantidad} filas) desde ${res.vigenciaDesde}`)
        await cargar()
      }
    } catch (e) {
      console.error(e)
      setError('Error al cargar seed')
    } finally {
      setGuardando(false)
    }
  }

  const handleNuevaVigencia = async () => {
    setError('')
    setMsg('')
    setGuardando(true)
    try {
      const payload = CLAVES_TARIFA.map((c) => ({
        clave: c.clave,
        tipoCuota: c.tipoCuota,
        monto: montos[c.clave] ?? c.montoDefault,
      }))
      const res = await crearNuevaVigencia({
        data: { vigenciaDesde: periodo, montos: payload },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg(`Nueva vigencia desde ${res.vigenciaDesde}`)
        await cargar()
      }
    } catch (e) {
      console.error(e)
      setError('Error al crear vigencia')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Tarifario</h2>
        <p className="text-sm text-gray-500">
          Importes por categoría de cuota. No edites filas viejas: creá una nueva
          vigencia.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          {error}
        </div>
      )}
      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {msg}
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-800">Vigentes hoy</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : vigentes.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay tarifas. Cargá la tabla inicial abajo.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600 bg-gray-50">
              <tr>
                <th className="px-2 py-1">Concepto</th>
                <th className="px-2 py-1">Monto</th>
                <th className="px-2 py-1">Desde</th>
                <th className="px-2 py-1">Hasta</th>
              </tr>
            </thead>
            <tbody>
              {vigentes.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1">{r.descripcion || r.tipoSocioSocial}</td>
                  <td className="px-2 py-1 font-medium">
                    ${Number(r.monto).toLocaleString('es-AR')}
                  </td>
                  <td className="px-2 py-1">{r.vigenciaDesde}</td>
                  <td className="px-2 py-1">{r.vigenciaHasta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-800">
          {todas.length === 0 ? 'Carga inicial' : 'Nueva vigencia'}
        </h3>
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Período desde (YYYY-MM)
          </label>
          <input
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-40"
            placeholder="2026-01"
          />
        </div>

        <div className="space-y-2">
          {CLAVES_TARIFA.map((c) => (
            <div key={c.clave} className="flex flex-wrap items-center gap-2">
              <span className="text-sm w-56">{c.label}</span>
              <input
                value={montos[c.clave] ?? ''}
                onChange={(e) =>
                  setMontos((prev) => ({ ...prev, [c.clave]: e.target.value }))
                }
                className="border rounded-lg px-3 py-1.5 text-sm w-28"
                inputMode="decimal"
              />
            </div>
          ))}
        </div>

        {todas.length === 0 ? (
          <button
            type="button"
            onClick={handleSeed}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
          >
            {guardando ? 'Guardando...' : 'Cargar tarifas iniciales'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNuevaVigencia}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
          >
            {guardando ? 'Guardando...' : 'Crear nueva vigencia'}
          </button>
        )}
        <p className="text-xs text-gray-500">
          Al crear una nueva vigencia, las tarifas abiertas se cierran el día
          anterior automáticamente.
        </p>
      </div>
    </div>
  )
}