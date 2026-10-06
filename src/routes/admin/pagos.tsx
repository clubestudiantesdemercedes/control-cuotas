import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  buscarPersonaParaPago,
  listarMediosPagoActivos,
  registrarPagoIndividual,
} from '../../server/pagos.functions'

export const Route = createFileRoute('/admin/pagos')({
  component: PagosPage,
})

type Persona = {
  id: number
  documentNumber: string
  firstName: string
  lastName: string
  memberNumber: string | null
}

type Cuota = {
  id: number
  periodo: string
  concepto: string
  montoFinal: string | number
  fechaVencimiento: string | null
  tipoCuota: string
}

type MedioPago = {
  id: number
  nombre: string
  tipo: string
}

function PagosPage() {
  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')

  const [persona, setPersona] = useState<Persona | null>(null)
  const [personasEncontradas, setPersonasEncontradas] = useState<Persona[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<number[]>(
    [],
  )

  const [mediosPago, setMediosPago] = useState<MedioPago[]>([])
  const [medioPagoId, setMedioPagoId] = useState('')
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [referencia, setReferencia] = useState('')
  const [observacion, setObservacion] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    void cargarMediosPago()
  }, [])

  async function cargarMediosPago() {
    try {
      const resultado = await listarMediosPagoActivos()

      if (resultado.ok) {
        setMediosPago(resultado.medios)

        if (resultado.medios.length > 0) {
          setMedioPagoId(String(resultado.medios[0].id))
        }
      }
    } catch {
      setError('No se pudieron cargar los medios de pago.')
    }
  }

  async function buscar() {
    const valor = busqueda.trim()

    if (!valor) {
      setError('Ingresá un DNI o número de socio.')
      return
    }

    setBuscando(true)
    setError('')
    setMensaje('')
    setPersona(null)
    setPersonasEncontradas([])
    setCuotas([])
    setCuotasSeleccionadas([])

    try {
      const resultado = await buscarPersonaParaPago({
        data: {
          busqueda: valor,
        },
      })

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      if (resultado.multiple) {
        setPersonasEncontradas(resultado.personas)
        return
      }

      setPersona(resultado.persona)
      setCuotas(resultado.cuotas)
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al buscar la persona.')
    } finally {
      setBuscando(false)
    }
  }

  async function seleccionarPersona(personaSeleccionada: Persona) {
    const valor =
      personaSeleccionada.documentNumber || personaSeleccionada.memberNumber

    if (!valor) return

    setBusqueda(valor)
    setPersonasEncontradas([])

    setBuscando(true)
    setError('')

    try {
      const resultado = await buscarPersonaParaPago({
        data: {
          busqueda: valor,
        },
      })

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      if (!resultado.multiple) {
        setPersona(resultado.persona)
        setCuotas(resultado.cuotas)
        setCuotasSeleccionadas([])
      }
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al cargar la persona.')
    } finally {
      setBuscando(false)
    }
  }

  function alternarCuota(cuotaId: number) {
    setCuotasSeleccionadas((actuales) =>
      actuales.includes(cuotaId)
        ? actuales.filter((id) => id !== cuotaId)
        : [...actuales, cuotaId],
    )
  }

  function seleccionarTodas() {
    if (cuotasSeleccionadas.length === cuotas.length) {
      setCuotasSeleccionadas([])
    } else {
      setCuotasSeleccionadas(cuotas.map((cuota) => cuota.id))
    }
  }

  const montoTotal = useMemo(() => {
    return cuotas
      .filter((cuota) => cuotasSeleccionadas.includes(cuota.id))
      .reduce((total, cuota) => total + Number(cuota.montoFinal), 0)
  }, [cuotas, cuotasSeleccionadas])

  async function guardarPago() {
    if (!persona) {
      setError('Seleccioná una persona.')
      return
    }

    if (cuotasSeleccionadas.length === 0) {
      setError('Seleccioná al menos una cuota.')
      return
    }

    if (!medioPagoId) {
      setError('Seleccioná un medio de pago.')
      return
    }

    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      const resultado = await registrarPagoIndividual({
        data: {
          personId: persona.id,
          cuotaIds: cuotasSeleccionadas,
          medioPagoId: Number(medioPagoId),
          fechaPago,
          referencia,
          observacion,
        },
      })

      if (!resultado.ok) {
        setError(resultado.error)
        return
      }

      setMensaje(
        `Pago registrado correctamente. Operación #${resultado.pagoId}. Total: ${formatearMonto(resultado.montoTotal)}.`,
      )

      setCuotas((actuales) =>
        actuales.filter((cuota) => !cuotasSeleccionadas.includes(cuota.id)),
      )
      setCuotasSeleccionadas([])
      setReferencia('')
      setObservacion('')
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al registrar el pago.')
    } finally {
      setGuardando(false)
    }
  }

  function nuevaBusqueda() {
    setBusqueda('')
    setPersona(null)
    setPersonasEncontradas([])
    setCuotas([])
    setCuotasSeleccionadas([])
    setError('')
    setMensaje('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Pagos</h2>
        <p className="text-sm text-gray-500">
          Registrar pagos e imputarlos a una o varias cuotas.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-gray-800">
          1. Buscar persona
        </h3>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void buscar()
              }
            }}
            placeholder="DNI o número de socio"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:max-w-md"
          />

          <button
            type="button"
            onClick={() => void buscar()}
            disabled={buscando}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>

          {persona && (
            <button
              type="button"
              onClick={nuevaBusqueda}
              className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Nueva búsqueda
            </button>
          )}
        </div>

        {personasEncontradas.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Se encontraron varias personas:
            </p>

            {personasEncontradas.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void seleccionarPersona(item)}
                className="block w-full rounded-md border border-gray-200 p-3 text-left hover:border-blue-400 hover:bg-blue-50"
              >
                <div className="font-medium text-gray-800">
                  {item.lastName}, {item.firstName}
                </div>

                <div className="text-xs text-gray-500">
                  DNI: {item.documentNumber}
                  {item.memberNumber
                    ? ` · Socio: ${item.memberNumber}`
                    : ''}
                </div>
              </button>
            ))}
          </div>
        )}

        {persona && (
          <div className="mt-4 rounded-md bg-gray-50 p-4">
            <div className="text-lg font-semibold text-gray-800">
              {persona.lastName}, {persona.firstName}
            </div>

            <div className="mt-1 text-sm text-gray-600">
              DNI: {persona.documentNumber}
              {persona.memberNumber
                ? ` · Socio: ${persona.memberNumber}`
                : ''}
            </div>
          </div>
        )}
      </section>

      {persona && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  2. Cuotas pendientes
                </h3>
                <p className="text-xs text-gray-500">
                  Solo se pueden cancelar cuotas completas.
                </p>
              </div>

              {cuotas.length > 0 && (
                <button
                  type="button"
                  onClick={seleccionarTodas}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {cuotasSeleccionadas.length === cuotas.length
                    ? 'Deseleccionar todas'
                    : 'Seleccionar todas'}
                </button>
              )}
            </div>

            {cuotas.length === 0 ? (
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
                Esta persona no tiene cuotas pendientes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                      <th className="w-10 px-3 py-3"></th>
                      <th className="px-3 py-3">Período</th>
                      <th className="px-3 py-3">Concepto</th>
                      <th className="px-3 py-3">Vencimiento</th>
                      <th className="px-3 py-3 text-right">Importe</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cuotas.map((cuota) => {
                      const seleccionada = cuotasSeleccionadas.includes(
                        cuota.id,
                      )

                      return (
                        <tr
                          key={cuota.id}
                          className={`border-b border-gray-100 ${
                            seleccionada ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={seleccionada}
                              onChange={() => alternarCuota(cuota.id)}
                              className="h-4 w-4"
                            />
                          </td>

                          <td className="px-3 py-3 font-medium text-gray-800">
                            {formatearPeriodo(cuota.periodo)}
                          </td>

                          <td className="px-3 py-3 text-gray-600">
                            {cuota.concepto}
                          </td>

                          <td className="px-3 py-3 text-gray-600">
                            {cuota.fechaVencimiento
                              ? formatearFecha(cuota.fechaVencimiento)
                              : '-'}
                          </td>

                          <td className="px-3 py-3 text-right font-medium text-gray-800">
                            {formatearMonto(Number(cuota.montoFinal))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {cuotasSeleccionadas.length > 0 && (
              <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
                <div className="text-right">
                  <div className="text-xs uppercase text-gray-500">
                    Total a pagar
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {formatearMonto(montoTotal)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {cuotasSeleccionadas.length}{' '}
                    {cuotasSeleccionadas.length === 1
                      ? 'cuota seleccionada'
                      : 'cuotas seleccionadas'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {cuotasSeleccionadas.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">
                3. Datos del pago
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Fecha de pago
                  </label>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Medio de pago
                  </label>
                  <select
                    value={medioPagoId}
                    onChange={(e) => setMedioPagoId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {mediosPago.map((medio) => (
                      <option key={medio.id} value={medio.id}>
                        {medio.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Referencia
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ej.: número de comprobante"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Observación
                  </label>
                  <input
                    type="text"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Observación opcional"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void guardarPago()}
                  disabled={guardando}
                  className="rounded-md bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando ? 'Registrando...' : 'Registrar pago'}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {mensaje}
        </div>
      )}
    </div>
  )
}

function formatearMonto(monto: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(monto)
}

function formatearFecha(fecha: string) {
  const partes = fecha.split('-')

  if (partes.length !== 3) return fecha

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function formatearPeriodo(periodo: string) {
  const [anio, mes] = periodo.split('-')

  if (!anio || !mes) return periodo

  const meses = [
    '',
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  const numeroMes = Number(mes)

  return meses[numeroMes]
    ? `${meses[numeroMes]} ${anio}`
    : periodo
}