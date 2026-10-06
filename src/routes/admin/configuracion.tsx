import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  getProximoNumeroSocio,
  setUltimoNumeroSocio,
} from '../../server/config.functions'
import { exportarPadron, importarPadron } from '../../server/padron.functions'
import {
  listarMediosPagoAdmin,
  seedMediosPagoClub,
  crearMedioPago,
  actualizarMedioPago,
} from '../../server/medios-pago.functions'

export const Route = createFileRoute('/admin/configuracion')({
  component: ConfiguracionPage,
})

function ConfiguracionPage() {
  const [ultimo, setUltimo] = useState('')
  const [proximo, setProximo] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [erroresImport, setErroresImport] = useState<
    { fila: number; mensaje: string }[]
  >([])

  const [medios, setMedios] = useState<any[]>([])
  const [tiposMedio, setTiposMedio] = useState<string[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState('transferencia')

  const cargar = async () => {
    setError('')
    const res = await getProximoNumeroSocio()
    if (res.ok) {
      setUltimo(String(res.ultimo))
      setProximo(res.proximo)
    }
  }

  const cargarMedios = async () => {
    try {
      const res = await listarMediosPagoAdmin()
      if (res.ok) {
        setMedios(res.medios)
        setTiposMedio([...res.tipos])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    cargar()
    cargarMedios()
  }, [])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    setError('')
    const n = Number(ultimo)
    if (!Number.isFinite(n) || n < 0) {
      setError('Número inválido')
      return
    }
    const res = await setUltimoNumeroSocio({ data: { ultimo: n } })
    if (!res.ok) setError(res.error)
    else {
      setMsg(`Guardado. Próximo n° de socio: ${n + 1}`)
      await cargar()
    }
  }

  const handleExportar = async () => {
    setError('')
    setMsg('')
    setExportando(true)
    try {
      const XLSX = await import('xlsx')
      const res = await exportarPadron()
      if (!res.ok) {
        setError('No se pudo exportar')
        return
      }
      const ws = XLSX.utils.json_to_sheet(res.rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Socios')
      XLSX.writeFile(
        wb,
        `padron-socios-${new Date().toISOString().slice(0, 10)}.xlsx`,
      )
      setMsg(`Exportadas ${res.rows.length} personas`)
    } catch (e) {
      console.error(e)
      setError('Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  const handleArchivo = async (file: File | null) => {
    setError('')
    setMsg('')
    setPreview(null)
    setNombreArchivo('')
    setErroresImport([])
    if (!file) return
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const sheetName = wb.SheetNames[0]
      const sheet = wb.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      })
      if (!rows.length) {
        setError('El Excel no tiene filas de datos')
        return
      }
      setPreview(rows)
      setNombreArchivo(file.name)
    } catch (e) {
      console.error(e)
      setError('No se pudo leer el Excel')
    }
  }

  const handleConfirmarImport = async () => {
    if (!preview?.length) return
    setImportando(true)
    setError('')
    setMsg('')
    setErroresImport([])
    try {
      const res = await importarPadron({ data: { filas: preview } })
      if (!res.ok) {
        setError('Falló la importación')
        return
      }
      setMsg(
        `Importación OK: ${res.creados} nuevos, ${res.actualizados} actualizados` +
          (res.errores.length
            ? ` · ${res.errores.length} filas con error`
            : ''),
      )
      setErroresImport(res.errores)
      if (res.errores.length) {
        setError(
          `${res.errores.length} filas no se importaron. Revisá el listado o descargá el reporte.`,
        )
      }
      setPreview(null)
      setNombreArchivo('')
      await cargar()
    } catch (e) {
      console.error(e)
      setError('Error al importar')
    } finally {
      setImportando(false)
    }
  }

  const descargarErrores = async () => {
    if (!erroresImport.length) return
    const XLSX = await import('xlsx')
    const rows = erroresImport.map((e) => ({
      Fila: e.fila,
      Motivo: e.mensaje,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Errores')
    XLSX.writeFile(
      wb,
      `errores-import-padron-${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
  }

  const handleSeedMedios = async () => {
    setError('')
    setMsg('')
    try {
      const res = await seedMediosPagoClub()
      if (!res.ok) setError(res.error)
      else {
        setMsg(`Se cargaron ${res.cantidad} medios de pago del club`)
        await cargarMedios()
      }
    } catch (e) {
      console.error(e)
      setError('Error al cargar medios de pago')
    }
  }

  const handleCrearMedio = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMsg('')
    try {
      const res = await crearMedioPago({
        data: { nombre: nuevoNombre, tipo: nuevoTipo },
      })
      if (!res.ok) setError(res.error)
      else {
        setMsg('Medio de pago creado')
        setNuevoNombre('')
        await cargarMedios()
      }
    } catch (err) {
      console.error(err)
      setError('Error al crear medio de pago')
    }
  }

  const handleToggleActiva = async (m: any) => {
    setError('')
    try {
      const res = await actualizarMedioPago({
        data: {
          id: m.id,
          nombre: m.nombre,
          tipo: m.tipo,
          alias: m.alias || undefined,
          cbu: m.cbu || undefined,
          datosPago: m.datosPago || undefined,
          orden: m.orden,
          activa: !m.activa,
        },
      })
      if (!res.ok) setError(res.error)
      else await cargarMedios()
    } catch (err) {
      console.error(err)
      setError('Error al actualizar medio de pago')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Configuración</h2>
        <p className="text-sm text-gray-500">
          Parámetros del sistema de cuotas (acceso restringido)
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

      <form
        onSubmit={guardar}
        className="bg-white border rounded-xl p-4 shadow-sm space-y-3"
      >
        <h3 className="font-semibold text-gray-800">Numeración de socios</h3>
        <p className="text-xs text-gray-500">
          Solo tocar si hay que alinear el contador con el libro físico.
        </p>
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Último n° de socio usado
          </label>
          <input
            value={ultimo}
            onChange={(e) => setUltimo(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-40"
          />
        </div>
        <p className="text-sm text-gray-600">
          Próximo a asignar: <strong>{proximo ?? '—'}</strong>
        </p>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
        >
          Guardar
        </button>
      </form>

      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-800">Medios de pago</h3>
        <p className="text-xs text-gray-500">
          Efectivo, débito automático, transferencias por cuenta y Mercado
          Pago. Solo los activos aparecen al registrar un pago.
        </p>

        {medios.length === 0 && (
          <button
            type="button"
            onClick={handleSeedMedios}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            Cargar medios del club (primera vez)
          </button>
        )}

        {medios.length > 0 && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Orden</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {medios.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{m.nombre}</td>
                    <td className="px-3 py-2">{m.tipo}</td>
                    <td className="px-3 py-2">{m.orden}</td>
                    <td className="px-3 py-2">
                      {m.activa ? (
                        <span className="text-green-700">Activo</span>
                      ) : (
                        <span className="text-gray-400">Inactivo</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActiva(m)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {m.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form
          onSubmit={handleCrearMedio}
          className="flex flex-wrap gap-2 items-end border-t pt-3"
        >
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nombre</label>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-56"
              placeholder="Ej. Transferencia — Cuenta General"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Tipo</label>
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {(tiposMedio.length
                ? tiposMedio
                : [
                    'efectivo',
                    'transferencia',
                    'mercado_pago',
                    'debito_automatico',
                  ]
              ).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            Agregar
          </button>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-800">Exportar padrón</h3>
        <p className="text-xs text-gray-500">
          Excel con el mismo formato que el import.
        </p>
        <button
          type="button"
          onClick={handleExportar}
          disabled={exportando}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
        >
          {exportando ? 'Generando...' : 'Exportar padrón (Excel)'}
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-800">Importar padrón</h3>
        <p className="text-xs text-gray-500">
          Columnas: DNI, Apellido, Nombre, Fecha_Nacimiento (DD/MM/AAAA), Nro
          Socio, Deporte, es_socio, categoria_social, Domicilio, Celular,
          Telefono, debito_automatico, Mail. Si el DNI o n° socio ya existe, se
          actualiza.
        </p>
        <label className="inline-block cursor-pointer bg-gray-100 hover:bg-gray-200 border rounded-lg px-4 py-2 text-sm text-gray-800">
          Seleccionar archivo Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleArchivo(e.target.files?.[0] ?? null)}
          />
        </label>
        {nombreArchivo && (
          <p className="text-sm text-gray-600">
            Archivo: <strong>{nombreArchivo}</strong> · {preview?.length ?? 0}{' '}
            filas
          </p>
        )}
        {preview && preview.length > 0 && (
          <div className="space-y-2">
            <div className="overflow-x-auto max-h-48 border rounded text-xs">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {Object.keys(preview[0])
                      .slice(0, 6)
                      .map((k) => (
                        <th key={k} className="px-2 py-1 text-left">
                          {k}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {Object.keys(preview[0])
                        .slice(0, 6)
                        .map((k) => (
                          <td key={k} className="px-2 py-1">
                            {String(row[k] ?? '')}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={handleConfirmarImport}
              disabled={importando}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm px-4 py-2 rounded-lg"
            >
              {importando
                ? 'Importando...'
                : `Confirmar importación (${preview.length} filas)`}
            </button>
          </div>
        )}
      </div>

      {erroresImport.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-800">
            Reporte de errores ({erroresImport.length})
          </h3>
          <div className="overflow-x-auto max-h-56 border rounded text-sm">
            <table className="w-full">
              <thead className="bg-amber-50 sticky top-0 text-left">
                <tr>
                  <th className="px-3 py-2 w-20">Fila</th>
                  <th className="px-3 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {erroresImport.map((e, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5 font-medium">{e.fila}</td>
                    <td className="px-3 py-1.5">{e.mensaje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={descargarErrores}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            Descargar reporte de errores (Excel)
          </button>
          <p className="text-xs text-gray-500">
            La fila es la del Excel (fila 1 = encabezados). Corregí esos datos y
            volvé a importar; las demás ya quedaron actualizadas.
          </p>
        </div>
      )}
    </div>
  )
}