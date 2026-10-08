import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  confirmarGeneracion,
  confirmarGeneracionIndividual,
  datosParaGenerar,
  previsualizarGeneracion,
  previsualizarGeneracionIndividual,
} from '../../server/cuotas-generar.functions'
import {
  listarCuotasPorPeriodo,
  listarPeriodosConCuotas,
} from '../../server/cuotas-listado.functions'
import {
  anularCuota,
  anularCuotasMasiva,
  anularCuotasPersonaPeriodo,
} from '../../server/cuotas-anular.functions'

const MOTIVOS_UI = [
  { codigo: 'baja_socio', label: 'Baja de socio / no corresponde cuota' },
  { codigo: 'error_generacion', label: 'Error en la generación' },
  { codigo: 'cambio_situacion', label: 'Cambio de categoría / deporte' },
  { codigo: 'tarifario', label: 'Tarifario incorrecto o desactualizado' },
  { codigo: 'duplicada', label: 'Cuota duplicada' },
  { codigo: 'otro', label: 'Otro' },
]

export const Route = createFileRoute('/admin/cuotas')({
  component: CuotasPage,
})

function CuotasPage() {
  const [tab, setTab] = useState<'listado' | 'generar' | 'individual'>(
    'listado',
  )

  const [periodos, setPeriodos] = useState<any[]>([])
  const [periodoLista, setPeriodoLista] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<
    'todas' | 'pendiente' | 'pagada' | 'anulada'
  >('todas')
  const [q, setQ] = useState('')
  const [cuotas, setCuotas] = useState<any[]>([])
  const [resumenLista, setResumenLista] = useState<any>(null)
  const [loadingLista, setLoadingLista] = useState(false)

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
  const [loadingGen, setLoadingGen] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<any>(null)

  const [periodoInd, setPeriodoInd] = useState('2026-03')
  const [tipoBusq, setTipoBusq] = useState<'dni' | 'socio'>('dni')
  const [busquedaInd, setBusquedaInd] = useState('')
  const [reemplazar, setReemplazar] = useState(true)
  const [previewInd, setPreviewInd] = useState<any>(null)
  const [soloAnular, setSoloAnular] = useState(false)
  const [motivoCodigo, setMotivoCodigo] = useState('baja_socio')
  const [observacionAnul, setObservacionAnul] = useState('')

  const cargarPeriodos = async () => {
    try {
      const res = await listarPeriodosConCuotas()
      if (res.ok) {
        setPeriodos(res.periodos)
        if (!periodoLista && res.periodos.length) {
          setPeriodoLista(res.periodos[0].periodo)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const cargarListado = async () => {
    if (!periodoLista) return
    setLoadingLista(true)
    setError('')
    try {
      const res = await listarCuotasPorPeriodo({
        data: {
          periodo: periodoLista,
          estado: estadoFiltro,
          q: q || undefined,
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setCuotas(res.cuotas)
        setResumenLista(res.resumen)
      }
    } catch (e) {
      console.error(e)
      setError('Error al listar cuotas')
    } finally {
      setLoadingLista(false)
    }
  }

  useEffect(() => {
    void cargarPeriodos()
  }, [])

  useEffect(() => {
    if (tab === 'listado' && periodoLista) {
      void cargarListado()
    }
  }, [tab, periodoLista, estadoFiltro])

  useEffect(() => {
    void (async () => {
      setLoadingGen(true)
      try {
        const res = await datosParaGenerar()
        if (res.ok) {
          setDisciplinas(res.disciplinas)
          setCategorias(res.categorias)
          setCatsDep(res.categorias.map((c: any) => c.id))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingGen(false)
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

  const handleAnular = async (cuotaId: number) => {
    const observacion = window.prompt(
      'Detalle de anulación (opcional, Enter para continuar):',
    )
    if (observacion == null) return
    setError('')
    setMsg('')
    setWorking(true)
    try {
      const res = await anularCuota({
        data: {
          cuotaId,
          motivoCodigo: 'otro',
          observacion: observacion.trim(),
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg(res.mensaje)
        await cargarListado()
        await cargarPeriodos()
      }
    } catch (e) {
      console.error(e)
      setError('Error al anular')
    } finally {
      setWorking(false)
    }
  }

  const handleAnularMasiva = async () => {
    if (!periodoLista) return
    const observacion = window.prompt(
      `Anular TODAS las pendientes de ${periodoLista}.\nDetalle / observación:`,
    )
    if (observacion == null) return
    if (
      !confirm(
        `¿Confirmás anular todas las pendientes de ${periodoLista}?\nNo se tocan las pagadas.`,
      )
    ) {
      return
    }
    setError('')
    setMsg('')
    setWorking(true)
    try {
      const res = await anularCuotasMasiva({
        data: {
          periodo: periodoLista,
          motivoCodigo: 'tarifario',
          observacion: observacion.trim(),
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg(res.mensaje)
        await cargarListado()
        await cargarPeriodos()
      }
    } catch (e) {
      console.error(e)
      setError('Error en anulación masiva')
    } finally {
      setWorking(false)
    }
  }

  const handleSoloAnular = async () => {
    if (!busquedaInd.trim()) return
    if (
      !confirm(
        `¿Anular cuotas pendientes de este socio en ${periodoInd}? No se generará una nueva.`,
      )
    ) {
      return
    }
    setError('')
    setMsg('')
    setWorking(true)
    try {
      const res = await anularCuotasPersonaPeriodo({
        data: {
          periodo: periodoInd,
          busqueda: busquedaInd,
          tipo: tipoBusq,
          motivoCodigo,
          observacion: observacionAnul,
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg(res.mensaje)
        setPreviewInd(null)
        await cargarPeriodos()
      }
    } catch (e) {
      console.error(e)
      setError('Error al anular')
    } finally {
      setWorking(false)
    }
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
          `Generadas ${res.creadas}. Omitidas: ${res.omitidas}.` +
            (res.errores?.length
              ? ` Errores: ${res.errores.join(' · ')}`
              : ''),
        )
        setPreview(null)
        await cargarPeriodos()
      }
    } catch (e) {
      console.error(e)
      setError('Error al confirmar')
    } finally {
      setWorking(false)
    }
  }

  const handlePreviewInd = async () => {
    setError('')
    setMsg('')
    setWorking(true)
    setPreviewInd(null)
    try {
      const res = await previsualizarGeneracionIndividual({
        data: {
          periodo: periodoInd,
          busqueda: busquedaInd,
          tipo: tipoBusq,
          reemplazarSiExiste: reemplazar,
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setPreviewInd(res)
        if (res.errores?.length) {
          setError(res.errores.join('\n'))
        }
      }
    } catch (e) {
      console.error(e)
      setError('Error en previsualización individual')
    } finally {
      setWorking(false)
    }
  }

  const handleConfirmarInd = async () => {
    if (!previewInd || previewInd.modo !== 'preview_individual') return
    if (
      !confirm(
        `¿Confirmar generación individual?` +
          (previewInd.aReemplazar
            ? ` Se anularán ${previewInd.aReemplazar} cuota(s) pendiente(s).`
            : ''),
      )
    ) {
      return
    }
    setError('')
    setMsg('')
    setWorking(true)
    try {
      const res = await confirmarGeneracionIndividual({
        data: {
          periodo: periodoInd,
          personId: previewInd.personId,
          reemplazarSiExiste: reemplazar,
        },
      })
      if (!res.ok) {
        setError((res as any).error || 'Error')
      } else {
        const avisos =
          res.errores?.length > 0 ? res.errores.join(' · ') : ''
        setMsg(
          `Individual OK: ${res.creadas} creadas, ${res.anuladas} anuladas.`,
        )
        if (avisos) {
          setError(avisos)
        }
        setPreviewInd(null)
        await cargarPeriodos()
      }
    } catch (e) {
      console.error(e)
      setError('Error al confirmar individual')
    } finally {
      setWorking(false)
    }
  }

  const handleExportarListado = async () => {
    if (!cuotas.length) {
      setError('No hay cuotas para exportar con este filtro')
      return
    }
    setError('')
    try {
      const XLSX = await import('xlsx')
      const rows = cuotas.map((c) => ({
        Id: c.id,
        Periodo: c.periodo,
        DNI: c.dni ?? '',
        Nro_Socio: c.nroSocio ?? '',
        Nombre: c.nombreCompleto ?? '',
        Tipo_cuota: c.tipoCuota ?? '',
        Subcategoria: c.subcategoriaCuota ?? '',
        Disciplina: c.disciplinaNombre ?? '',
        Categoria_deportiva: c.categoriaDeportivaNombre ?? '',
        Concepto: c.concepto ?? '',
        Monto_original: Number(c.montoOriginal),
        Monto_final: Number(c.montoFinal),
        Vencimiento: c.fechaVencimiento ?? '',
        Estado: c.estado ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, periodoLista || 'Cuotas')
      XLSX.writeFile(
        wb,
        `cuotas-${periodoLista || 'periodo'}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      )
      setMsg(`Exportadas ${rows.length} cuotas`)
    } catch (e) {
      console.error(e)
      setError('Error al exportar Excel')
    }
  }

  const montoItem = (i: any) =>
    Number(i.montoFinal ?? i.monto ?? 0)

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Cuotas</h2>
        <p className="text-sm text-gray-500">
          Listado, generación masiva e individual, anulación
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['listado', 'Listado'],
            ['generar', 'Generar masiva'],
            ['individual', 'Individual'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setError('')
              setMsg('')
            }}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              tab === id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm whitespace-pre-line">
          {error}
        </div>
      )}
      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {msg}
        </div>
      )}

      {tab === 'listado' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Período</label>
              <select
                value={periodoLista}
                onChange={(e) => setPeriodoLista(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {periodos.length === 0 && (
                  <option value="">Sin períodos</option>
                )}
                {periodos.map((p) => (
                  <option key={p.periodo} value={p.periodo}>
                    {p.periodo} ({p.cantidad} cuotas)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Estado</label>
              <select
                value={estadoFiltro}
                onChange={(e) =>
                  setEstadoFiltro(e.target.value as typeof estadoFiltro)
                }
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="todas">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="pagada">Pagadas</option>
                <option value="anulada">Anuladas</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-600 mb-1">Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="DNI, socio, nombre..."
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
            <button
              type="button"
              onClick={() => void cargarListado()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => void handleExportarListado()}
              disabled={!cuotas.length}
              className="bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white text-sm px-4 py-2 rounded-lg"
            >
              Descargar Excel
            </button>
            <button
              type="button"
              onClick={() => void handleAnularMasiva()}
              disabled={working || !periodoLista}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm px-4 py-2 rounded-lg"
            >
              Anular pendientes del período
            </button>
          </div>

          {resumenLista && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-white border rounded-lg p-3">
                <p className="text-gray-500 text-xs">Cantidad</p>
                <p className="font-semibold text-lg">{resumenLista.cantidad}</p>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <p className="text-gray-500 text-xs">Total</p>
                <p className="font-semibold text-lg">
                  ${Number(resumenLista.total).toLocaleString('es-AR')}
                </p>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <p className="text-gray-500 text-xs">Pendientes</p>
                <p className="font-semibold text-lg text-amber-700">
                  {resumenLista.pendientes}
                </p>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <p className="text-gray-500 text-xs">Saldo pendiente</p>
                <p className="font-semibold text-lg text-amber-700">
                  $
                  {Number(resumenLista.totalPendiente).toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            {loadingLista ? (
              <p className="p-4 text-sm text-gray-500">Cargando...</p>
            ) : cuotas.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">
                No hay cuotas para este filtro.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-[65vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Persona</th>
                      <th className="px-3 py-2">DNI</th>
                      <th className="px-3 py-2">Concepto</th>
                      <th className="px-3 py-2">Monto</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuotas.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-2 font-medium">
                          {c.nombreCompleto || '—'}
                        </td>
                        <td className="px-3 py-2">{c.dni || '—'}</td>
                        <td className="px-3 py-2">{c.concepto}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          ${Number(c.montoFinal).toLocaleString('es-AR')}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              c.estado === 'pagada'
                                ? 'text-green-700'
                                : c.estado === 'pendiente'
                                  ? 'text-amber-700'
                                  : 'text-gray-500'
                            }
                          >
                            {c.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {c.estado === 'pendiente' && (
                            <button
                              type="button"
                              disabled={working}
                              onClick={() => void handleAnular(c.id)}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Anular
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'generar' && (
        <div className="max-w-3xl space-y-4">
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
              <p className="text-sm font-medium mb-2">Categorías sociales</p>
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
              <p className="text-sm font-medium mb-2">Categorías deportivas</p>
              {loadingGen ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : (
                porDisciplina.map((d) => (
                  <div key={d.id} className="mb-2">
                    <p className="text-xs font-semibold text-gray-600">
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
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={working}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
            >
              {working ? 'Procesando...' : 'Previsualizar'}
            </button>
          </div>

          {preview && preview.modo === 'preview' && (
            <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
              <p className="text-sm">
                A generar: <strong>{preview.totalAGenerar}</strong> · Omitidas:{' '}
                <strong>{preview.omitidas}</strong> · Total:{' '}
                <strong>
                  ${Number(preview.totalMonto).toLocaleString('es-AR')}
                </strong>
              </p>
              {preview.errores?.length > 0 && (
                <p className="text-xs text-amber-700">
                  Avisos: {preview.errores.join(' · ')}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleConfirmar()}
                disabled={working || preview.totalAGenerar === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm px-4 py-2 rounded-lg"
              >
                Confirmar generación
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'individual' && (
        <div className="max-w-xl space-y-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
            <p className="text-sm text-gray-600">
              Generá según la situación actual, o solo anulá pendientes de un
              período sin crear otra cuota. Si tiene débito, el monto final es
              90% de la tarifa.
            </p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Período (YYYY-MM)
              </label>
              <input
                value={periodoInd}
                onChange={(e) => setPeriodoInd(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-40"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipoBusq('dni')}
                className={`px-3 py-1.5 rounded text-sm border ${
                  tipoBusq === 'dni'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white'
                }`}
              >
                DNI
              </button>
              <button
                type="button"
                onClick={() => setTipoBusq('socio')}
                className={`px-3 py-1.5 rounded text-sm border ${
                  tipoBusq === 'socio'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white'
                }`}
              >
                N° socio
              </button>
            </div>
            <div>
              <input
                value={busquedaInd}
                onChange={(e) => setBusquedaInd(e.target.value)}
                placeholder={
                  tipoBusq === 'dni' ? 'Número de documento' : 'Número de socio'
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={soloAnular}
                onChange={(e) => {
                  setSoloAnular(e.target.checked)
                  setPreviewInd(null)
                }}
              />
              Solo anular cuota(s) pendiente(s) (no generar)
            </label>

            {soloAnular ? (
              <div className="space-y-2 border border-red-100 bg-red-50 rounded-lg p-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Motivo (clasificación)
                  </label>
                  <select
                    value={motivoCodigo}
                    onChange={(e) => setMotivoCodigo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {MOTIVOS_UI.map((m) => (
                      <option key={m.codigo} value={m.codigo}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Detalle / observación
                  </label>
                  <textarea
                    value={observacionAnul}
                    onChange={(e) => setObservacionAnul(e.target.value)}
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    placeholder="Opcional: ej. se dio de baja el 15/03"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSoloAnular()}
                  disabled={working || !busquedaInd.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm px-4 py-2 rounded-lg"
                >
                  {working
                    ? 'Anulando...'
                    : 'Anular pendientes de este período'}
                </button>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reemplazar}
                    onChange={(e) => setReemplazar(e.target.checked)}
                  />
                  Si ya existe cuota pendiente, anularla y reemplazarla
                </label>
                <button
                  type="button"
                  onClick={() => void handlePreviewInd()}
                  disabled={working || !busquedaInd.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
                >
                  {working ? 'Procesando...' : 'Previsualizar'}
                </button>
              </>
            )}
          </div>

          {!soloAnular &&
            previewInd &&
            previewInd.modo === 'preview_individual' && (
              <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
                {previewInd.items?.[0] && (
                  <p className="text-base font-semibold text-gray-900">
                    {previewInd.items[0].nombreCompleto}
                    {previewInd.items[0].nroSocio
                      ? ` · Socio ${previewInd.items[0].nroSocio}`
                      : ''}
                    {previewInd.items[0].dni
                      ? ` · DNI ${previewInd.items[0].dni}`
                      : ''}
                  </p>
                )}
                <p className="text-sm">
                  Ítems: <strong>{previewInd.items?.length ?? 0}</strong>
                  {previewInd.aReemplazar > 0 && (
                    <>
                      {' '}
                      · A reemplazar:{' '}
                      <strong className="text-amber-700">
                        {previewInd.aReemplazar}
                      </strong>
                    </>
                  )}{' '}
                  · Total:{' '}
                  <strong>
                    ${Number(previewInd.totalMonto).toLocaleString('es-AR')}
                  </strong>
                </p>
                <ul className="text-sm space-y-1">
                  {(previewInd.items || []).map((i: any, idx: number) => (
                    <li key={idx} className="border rounded px-2 py-1">
                      <span className="font-medium">{i.nombreCompleto}</span>
                      {' — '}
                      {i.concepto} · $
                      {montoItem(i).toLocaleString('es-AR')}
                      {i.tieneDebito ? (
                        <span className="text-blue-700 text-xs">
                          {' '}
                          (débito -10%)
                        </span>
                      ) : null}
                      {i.cuotaExistenteId ? (
                        <span className="text-amber-700 text-xs">
                          {' '}
                          (reemplaza #{i.cuotaExistenteId})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {previewInd.errores?.length > 0 && (
                  <p className="text-xs text-amber-700">
                    {previewInd.errores.join(' · ')}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleConfirmarInd()}
                  disabled={working || !(previewInd.items?.length > 0)}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm px-4 py-2 rounded-lg"
                >
                  Confirmar
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  )
}