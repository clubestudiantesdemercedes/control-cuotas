import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  confirmarGeneracion,
  datosParaGenerar,
  previsualizarGeneracion,
} from '../../server/cuotas-generar.functions'

export const Route = createFileRoute('/admin/cuotas')({
  component: CuotasPage,
})

function CuotasPage() {
  const [periodo, setPeriodo] = useState('2026-03')
  const [catsSocial, setCatsSocial] = useState<string[]>([
    'menor',
    'cadete',
    'activo',
    'vitalicio',
    '3_familiar',
    '4_familiar',
  ])
  const [catsDep, setCatsDep] = useState<number[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await datosParaGenerar()
        if (res.ok) {
          setDisciplinas(res.disciplinas)
          setCategorias(res.categorias)
          setCatsDep(res.categorias.map((c: any) => c.id))
        }
      } catch (e) {
        console.error(e)
        setError('Error al cargar categorías')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const porDisciplina = useMemo(() => {
    return disciplinas.map((d) => ({
      ...d,
      cats: categorias.filter((c) => c.disciplinaId === d.id),
    }))
  }, [disciplinas, categorias])

  const toggleSocial = (c: string) => {
    setCatsSocial((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  const toggleDep = (id: number) => {
    setCatsDep((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handlePreview = async () => {
    setError('')
    setMsg('')
    setWorking(true)
    setPreview(null)
    try {
      const res = await previsualizarGeneracion({
        data: {
          periodo,
          categoriasSociales: catsSocial,
          categoriasDeportivasIds: catsDep,
        },
      })
      if (!res.ok) setError(res.error)
      else setPreview(res)
    } catch (e) {
      console.error(e)
      setError('Error en previsualización')
    } finally {
      setWorking(false)
    }
  }

  const handleConfirmar = async () => {
    if (!preview || preview.modo !== 'preview') return
    if (!confirm(`¿Generar ${preview.totalAGenerar} cuotas para ${periodo}?`)) {
      return
    }
    setError('')
    setMsg('')
    setWorking(true)
    try {
      const res = await confirmarGeneracion({
        data: {
          periodo,
          categoriasSociales: catsSocial,
          categoriasDeportivasIds: catsDep,
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg(
          `Generadas ${res.creadas}. Omitidas (ya existían): ${res.omitidas}.` +
            (res.errores?.length ? ` Errores: ${res.errores.length}` : ''),
        )
        setPreview(null)
      }
    } catch (e) {
      console.error(e)
      setError('Error al confirmar')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Generar cuotas</h2>
        <p className="text-sm text-gray-500">
          Elegí el período y las categorías. Previsualizá antes de confirmar.
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
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Período (YYYY-MM)
          </label>
          <input
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-40"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-800 mb-2">
            Categorías sociales
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            {[
              'menor',
              'cadete',
              'activo',
              'vitalicio',
              '3_familiar',
              '4_familiar',
            ].map((c) => (
              <label key={c} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={catsSocial.includes(c)}
                  onChange={() => toggleSocial(c)}
                />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-800 mb-2">
            Categorías deportivas
          </p>
          {loading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : (
            <div className="space-y-3">
              {porDisciplina.map((d) => (
                <div key={d.id}>
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    {d.nombre}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {d.cats.map((c: any) => (
                      <label key={c.id} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={catsDep.includes(c.id)}
                          onChange={() => toggleDep(c.id)}
                        />
                        {c.nombre}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={working}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
        >
          {working ? 'Procesando...' : 'Previsualizar'}
        </button>
      </div>

      {preview && preview.modo === 'preview' && (
        <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-800">
            Vista previa · {preview.periodo}
          </h3>
          <p className="text-sm text-gray-600">
            A generar: <strong>{preview.totalAGenerar}</strong> · Ya existían:{' '}
            <strong>{preview.omitidas}</strong> · Total estimado:{' '}
            <strong>
              ${Number(preview.totalMonto).toLocaleString('es-AR')}
            </strong>
          </p>

          {preview.resumen?.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-2 py-1">Grupo</th>
                  <th className="px-2 py-1">Personas</th>
                  <th className="px-2 py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {preview.resumen.map((r: any) => (
                  <tr key={r.label} className="border-t">
                    <td className="px-2 py-1">{r.label}</td>
                    <td className="px-2 py-1">{r.personas}</td>
                    <td className="px-2 py-1">
                      ${Number(r.total).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {preview.errores?.length > 0 && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded p-2">
              {preview.errores.slice(0, 10).map((e: string, i: number) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={working || preview.totalAGenerar === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm px-4 py-2 rounded-lg"
          >
            Confirmar generación
          </button>
        </div>
      )}
    </div>
  )
}