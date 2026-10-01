import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  previewImportPagos,
  confirmarImportPagos,
} from '../../server/pagos-import.functions'

export const Route = createFileRoute('/admin/importar-pagos')({
  component: ImportarPagosPage,
})

function ImportarPagosPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<any>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setOkMsg('')
    setPreview(null)
    setLoading(true)
    setFileName(file.name)

    try {
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const fileBase64 = btoa(binary)

      const res = await previewImportPagos({
        data: { fileBase64, fileName: file.name },
      })

      if (!res.ok) {
        setError(res.error)
      } else {
        setPreview(res)
      }
    } catch (err) {
      console.error(err)
      setError('No se pudo procesar el archivo')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const handleConfirmar = async () => {
    if (!preview?.todasNuevas?.length) return
    setLoading(true)
    setError('')
    setOkMsg('')
    try {
      const res = await confirmarImportPagos({
        data: {
          fileName,
          filas: preview.todasNuevas.map((f: any) => ({
            dni: f.dni,
            fechaPago: f.fechaPago,
            periodo: f.periodo,
            nombreSocio: f.nombreSocio,
            pagador: f.pagador,
            categoria: f.categoria,
            importe: f.importe,
            formaPago: f.formaPago,
            fingerprint: f.fingerprint,
          })),
        },
      })
      if (!res.ok) {
        setError(res.error)
      } else {
        setOkMsg(
          `Importación OK: ${res.insertados} nuevos` +
            (res.omitidos ? `, ${res.omitidos} ya existían` : '') +
            (res.sinDni ? `, ${res.sinDni} sin DNI` : ''),
        )
        setPreview(null)
      }
    } catch (err) {
      console.error(err)
      setError('Error al confirmar importación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Importar pagos</h2>
        <p className="text-sm text-gray-500">
          Subí el Excel de Google Sheets (hoja <strong>Detalle</strong>). Solo se
          importan filas con datos. Las ya importadas no se duplican.
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

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Archivo .xlsx
        </label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          disabled={loading}
          className="text-sm"
        />
        {loading && <p className="text-sm text-gray-500 mt-2">Procesando…</p>}
      </div>

      {preview && (
        <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-800">Vista previa — {preview.fileName}</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Registros leídos: <strong>{preview.total}</strong></li>
            <li>Nuevos: <strong className="text-green-700">{preview.nuevos}</strong></li>
            <li>Ya existentes: <strong>{preview.existentes}</strong></li>
            <li>Con errores: <strong className="text-amber-700">{preview.errores}</strong></li>
            <li>Sin DNI (entre los válidos): <strong>{preview.sinDni}</strong></li>
          </ul>

          {preview.muestraNuevos?.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-gray-500 mb-1">
                Muestra de nuevos (máx. 50):
              </p>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-2 py-1">DNI</th>
                    <th className="px-2 py-1">Socio</th>
                    <th className="px-2 py-1">Período</th>
                    <th className="px-2 py-1">Fecha</th>
                    <th className="px-2 py-1">Importe</th>
                    <th className="px-2 py-1">Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.muestraNuevos.map((f: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{f.dni || '—'}</td>
                      <td className="px-2 py-1">{f.nombreSocio || '—'}</td>
                      <td className="px-2 py-1">{f.periodo}</td>
                      <td className="px-2 py-1">{f.fechaPago}</td>
                      <td className="px-2 py-1">
                        ${Number(f.importe).toLocaleString('es-AR')}
                      </td>
                      <td className="px-2 py-1">{f.formaPago || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.nuevos > 0 && (
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
            >
              Confirmar importación ({preview.nuevos} nuevos)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
