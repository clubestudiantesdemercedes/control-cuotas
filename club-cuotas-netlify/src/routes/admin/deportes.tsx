import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  listarDisciplinas,
  crearDisciplina,
  listarCategoriasPorDisciplina,
  crearCategoriaDeportiva,
} from '../../server/deportes.functions'

export const Route = createFileRoute('/admin/deportes')({
  component: DeportesPage,
})

const MESES = [
  { n: 1, label: 'Ene' },
  { n: 2, label: 'Feb' },
  { n: 3, label: 'Mar' },
  { n: 4, label: 'Abr' },
  { n: 5, label: 'May' },
  { n: 6, label: 'Jun' },
  { n: 7, label: 'Jul' },
  { n: 8, label: 'Ago' },
  { n: 9, label: 'Sep' },
  { n: 10, label: 'Oct' },
  { n: 11, label: 'Nov' },
  { n: 12, label: 'Dic' },
]

function DeportesPage() {
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [disciplinaId, setDisciplinaId] = useState<number | null>(null)
  const [categorias, setCategorias] = useState<any[]>([])
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')

  const [nuevoDeporte, setNuevoDeporte] = useState('')
  const [nombreCat, setNombreCat] = useState('')
  const [edadDesde, setEdadDesde] = useState('')
  const [edadHasta, setEdadHasta] = useState('')
  const [mesesCobro, setMesesCobro] = useState<number[]>([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

  const cargarDisciplinas = async () => {
    setError('')
    try {
      const res = await listarDisciplinas()
      if (res.ok) {
        setDisciplinas(res.disciplinas)
        if (res.disciplinas.length && disciplinaId === null) {
          setDisciplinaId(res.disciplinas[0].id)
        }
      }
    } catch (e) {
      console.error(e)
      setError('Error al cargar deportes')
    }
  }

  const cargarCategorias = async (id: number) => {
    try {
      const res = await listarCategoriasPorDisciplina({ data: { disciplinaId: id } })
      if (res.ok) setCategorias(res.categorias)
    } catch (e) {
      console.error(e)
      setError('Error al cargar categorías')
    }
  }

  useEffect(() => {
    cargarDisciplinas()
  }, [])

  useEffect(() => {
    if (disciplinaId != null) cargarCategorias(disciplinaId)
  }, [disciplinaId])

  const handleCrearDeporte = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setOkMsg('')
    const res = await crearDisciplina({ data: { nombre: nuevoDeporte } })
    if (!res.ok) {
      setError(res.error)
      return
    }
    setNuevoDeporte('')
    setOkMsg('Deporte creado')
    await cargarDisciplinas()
    if (res.disciplina) setDisciplinaId(res.disciplina.id)
  }

  const toggleMes = (n: number) => {
    setMesesCobro((prev) =>
      prev.includes(n) ? prev.filter((m) => m !== n) : [...prev, n].sort((a, b) => a - b),
    )
  }

  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (disciplinaId == null) return
    setError('')
    setOkMsg('')
    const res = await crearCategoriaDeportiva({
      data: {
        disciplinaId,
        nombre: nombreCat,
        edadDesde: edadDesde ? Number(edadDesde) : null,
        edadHasta: edadHasta ? Number(edadHasta) : null,
        mesesCobro,
      },
    })
    if (!res.ok) {
      setError(res.error)
      return
    }
    setNombreCat('')
    setEdadDesde('')
    setEdadHasta('')
    setOkMsg('Categoría creada')
    await cargarCategorias(disciplinaId)
  }

  const disciplinaActual = disciplinas.find((d) => d.id === disciplinaId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Deportes</h2>
        <p className="text-sm text-gray-500">
          Disciplinas y categorías (cada deporte tiene las suyas). Los importes se cargarán después en tarifario.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {okMsg}
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 shadow-sm max-w-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Nuevo deporte</h3>
        <form onSubmit={handleCrearDeporte} className="flex gap-2">
          <input
            value={nuevoDeporte}
            onChange={(e) => setNuevoDeporte(e.target.value)}
            placeholder="Ej. Fútbol"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg"
          >
            Agregar
          </button>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-2">Seleccionar deporte</h3>
        {disciplinas.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay deportes cargados.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {disciplinas.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDisciplinaId(d.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  disciplinaId === d.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {d.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {disciplinaId != null && (
        <>
          <div className="bg-white border rounded-xl p-4 shadow-sm max-w-xl">
            <h3 className="font-semibold text-gray-800 mb-2">
              Nueva categoría en {disciplinaActual?.nombre}
            </h3>
            <form onSubmit={handleCrearCategoria} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                <input
                  value={nombreCat}
                  onChange={(e) => setNombreCat(e.target.value)}
                  placeholder="Ej. Infantiles, 7ª, Primera"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Edad desde (opcional)</label>
                  <input
                    type="number"
                    value={edadDesde}
                    onChange={(e) => setEdadDesde(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Edad hasta (opcional)</label>
                  <input
                    type="number"
                    value={edadHasta}
                    onChange={(e) => setEdadHasta(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Meses de cobro</label>
                <div className="flex flex-wrap gap-2">
                  {MESES.map((m) => (
                    <button
                      key={m.n}
                      type="button"
                      onClick={() => toggleMes(m.n)}
                      className={`px-2 py-1 rounded text-xs border ${
                        mesesCobro.includes(m.n)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                Guardar categoría
              </button>
            </form>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
            <h3 className="font-semibold text-gray-800 px-4 pt-4">
              Categorías de {disciplinaActual?.nombre}
            </h3>
            {categorias.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Sin categorías todavía.</p>
            ) : (
              <table className="w-full text-sm mt-2">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Edades</th>
                    <th className="px-3 py-2">Meses cobro</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{c.nombre}</td>
                      <td className="px-3 py-2">
                        {c.edadDesde != null || c.edadHasta != null
                          ? `${c.edadDesde ?? '—'} a ${c.edadHasta ?? '—'}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {Array.isArray(c.mesesCobro)
                          ? c.mesesCobro.join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}