import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  getProximoNumeroSocio,
  setUltimoNumeroSocio,
} from '../../server/config.functions'

export const Route = createFileRoute('/admin/configuracion')({
  component: ConfiguracionPage,
})

function ConfiguracionPage() {
  const [ultimo, setUltimo] = useState('')
  const [proximo, setProximo] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const cargar = async () => {
    setError('')
    const res = await getProximoNumeroSocio()
    if (res.ok) {
      setUltimo(String(res.ultimo))
      setProximo(res.proximo)
    }
  }

  useEffect(() => {
    cargar()
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

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Configuración</h2>
        <p className="text-sm text-gray-500">
          Parámetros del sistema de cuotas
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
          Solo tocar si hay que alinear el contador con el libro físico. El
          próximo alta de socio usará este valor + 1.
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
    </div>
  )
}