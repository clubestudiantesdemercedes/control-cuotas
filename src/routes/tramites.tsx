import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  crearSolicitudTramite,
  listarDisciplinasActivasPublico,
  listarMediosPagoPublico,
} from '../server/solicitudes.functions'
import {
  WHATSAPP_SECRETARIA_DISPLAY,
  WHATSAPP_SECRETARIA_URL,
} from '../lib/contacto-club'

export const Route = createFileRoute('/tramites')({
  component: TramitesPage,
})

type TipoTramite = 'alta' | 'debito_automatico' | 'baja'

type MedioPublico = {
  id: number
  nombre: string
  tipo: string
  orden?: number
  alias?: string | null
  cbu?: string | null
  cuit?: string | null
  datosPago?: string | null
  esDefaultSocial?: boolean
  disciplinaId?: number | null
}

/** Códigos de motivo de baja (mismo listado que valida el servidor) */
export const MOTIVOS_BAJA = [
  {
    codigo: 'cese_actividad_deportiva',
    label: 'Cese de la actividad deportiva',
  },
  { codigo: 'baja_socio', label: 'Baja como socio del club' },
  { codigo: 'problemas_economicos', label: 'Problemas económicos' },
  { codigo: 'mudanza', label: 'Mudanza / cambio de localidad' },
  { codigo: 'salud', label: 'Motivos de salud' },
  {
    codigo: 'disconformidad',
    label: 'Disconformidad con el servicio o la cuota',
  },
  { codigo: 'otro', label: 'Otro (indicar en el detalle)' },
] as const

function labelMotivoBaja(codigo: string) {
  return MOTIVOS_BAJA.find((m) => m.codigo === codigo)?.label ?? codigo
}

function TramitesPage() {
  const [tipo, setTipo] = useState<TipoTramite | null>(null)
  const [disciplinas, setDisciplinas] = useState<{ id: number; nombre: string }[]>(
    [],
  )
  const [medios, setMedios] = useState<MedioPublico[]>([])

  const [documentNumber, setDocumentNumber] = useState('')
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [genero, setGenero] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneAlt, setPhoneAlt] = useState('')
  const [email, setEmail] = useState('')
  const [domicilioCalle, setDomicilioCalle] = useState('')
  const [domicilioLocalidad, setDomicilioLocalidad] = useState('')
  const [domicilioPartido, setDomicilioPartido] = useState('')
  const [domicilioProvincia, setDomicilioProvincia] = useState('Buenos Aires')
  const [domicilioCp, setDomicilioCp] = useState('')

  const [esDeportista, setEsDeportista] = useState(false)
  const [disciplinaId, setDisciplinaId] = useState('')
  const [solicitaBeca, setSolicitaBeca] = useState(false)
  const [memberNumberSugerido, setMemberNumberSugerido] = useState('')
  const [grupoFamiliarNota, setGrupoFamiliarNota] = useState('')

  const [formaPago, setFormaPago] = useState('')
  const [medioPagoId, setMedioPagoId] = useState('')
  const [domicilioCobroDistinto, setDomicilioCobroDistinto] = useState(false)
  const [domicilioCobroCalle, setDomicilioCobroCalle] = useState('')
  const [domicilioCobroLocalidad, setDomicilioCobroLocalidad] = useState('')
  const [domicilioCobroObs, setDomicilioCobroObs] = useState('')

  const [motivoBaja, setMotivoBaja] = useState('')
  const [detalleBaja, setDetalleBaja] = useState('')
  const [observacion, setObservacion] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [mostrarWsp, setMostrarWsp] = useState(false)
  const [comprobante, setComprobante] = useState<{
    id: number
    tipo: TipoTramite
    resumen: string
  } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [d, m] = await Promise.all([
          listarDisciplinasActivasPublico(),
          listarMediosPagoPublico(),
        ])
        if (d.ok) setDisciplinas(d.disciplinas)
        if (m.ok) setMedios(m.medios as MedioPublico[])
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  useEffect(() => {
    if (formaPago !== 'transferencia') return
    if (esDeportista && disciplinaId) {
      const deDisc = medios.find(
        (m) =>
          (m.tipo === 'transferencia' || m.tipo === 'mercado_pago') &&
          m.disciplinaId === Number(disciplinaId),
      )
      if (deDisc) {
        setMedioPagoId(String(deDisc.id))
        return
      }
    }
    const def = medios.find(
      (m) =>
        (m.tipo === 'transferencia' || m.tipo === 'mercado_pago') &&
        m.esDefaultSocial,
    )
    if (def) setMedioPagoId(String(def.id))
  }, [formaPago, esDeportista, disciplinaId, medios])

  function resetMensajes() {
    setError('')
    setExito('')
    setMostrarWsp(false)
  }

  function elegirTipo(t: TipoTramite) {
    setTipo(t)
    setComprobante(null)
    resetMensajes()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tipo) return

    if (tipo === 'baja') {
      if (!motivoBaja) {
        setError('Elegí el motivo de la baja.')
        return
      }
      if (motivoBaja === 'otro' && detalleBaja.trim().length < 5) {
        setError('Si elegís “Otro”, completá el detalle del motivo.')
        return
      }
    }

    setEnviando(true)
    resetMensajes()

    const motivoBajaTexto =
      tipo === 'baja'
        ? motivoBaja === 'otro'
          ? `Otro: ${detalleBaja.trim()}`
          : `${labelMotivoBaja(motivoBaja)}${
              detalleBaja.trim() ? ` — ${detalleBaja.trim()}` : ''
            }`
        : undefined

    try {
      const res = await crearSolicitudTramite({
        data: {
          tipo,
          documentType: 'DNI',
          documentNumber,
          lastName,
          firstName,
          birthDate: birthDate || undefined,
          genero: genero || undefined,
          phone,
          phoneAlt: phoneAlt || undefined,
          email,
          domicilioCalle,
          domicilioLocalidad,
          domicilioPartido,
          domicilioProvincia,
          domicilioCp,
          domicilioCobroDistinto,
          domicilioCobroCalle,
          domicilioCobroLocalidad,
          domicilioCobroObs,
          memberNumberSugerido: memberNumberSugerido || undefined,
          esDeportista: tipo === 'alta' ? esDeportista : false,
          disciplinaId:
            tipo === 'alta' && esDeportista && disciplinaId
              ? Number(disciplinaId)
              : null,
          solicitaBeca: tipo === 'alta' ? solicitaBeca : false,
          formaPago:
            tipo === 'alta' || tipo === 'debito_automatico'
              ? tipo === 'debito_automatico'
                ? 'debito_automatico'
                : formaPago
              : undefined,
          medioPagoId:
            formaPago === 'transferencia' && medioPagoId
              ? Number(medioPagoId)
              : null,
          grupoFamiliarNota: grupoFamiliarNota || undefined,
          observacionSolicitante: observacion || undefined,
          motivoBaja: motivoBajaTexto,
          motivoBajaCodigo: tipo === 'baja' ? motivoBaja : undefined,
        },
      })

      if (!res.ok) {
        setError(res.error)
        setMostrarWsp(!!res.contactarWsp)
        return
      }

      const tipoLabel =
        tipo === 'alta'
          ? 'Alta de socio'
          : tipo === 'debito_automatico'
            ? 'Débito automático'
            : 'Solicitud de baja'

      const lineas = [
        `Trámite N° ${res.id}`,
        `Tipo: ${tipoLabel}`,
        `DNI: ${documentNumber}`,
        lastName || firstName
          ? `Nombre: ${lastName}, ${firstName}`
          : null,
        tipo === 'baja' && motivoBajaTexto
          ? `Motivo: ${motivoBajaTexto}`
          : null,
        'Estado: pendiente de revisión por administración',
      ].filter(Boolean)

      setComprobante({
        id: res.id,
        tipo,
        resumen: lineas.join('\n'),
      })
      setExito(res.mensaje)
      setMostrarWsp(!!res.contactarWsp)
      setTipo(null)
    } catch (err) {
      console.error(err)
      setError(
        'No se pudo enviar el trámite. Intentá de nuevo o escribinos por WhatsApp.',
      )
      setMostrarWsp(true)
    } finally {
      setEnviando(false)
    }
  }

  const mediosTransferencia = medios.filter(
    (m) => m.tipo === 'transferencia' || m.tipo === 'mercado_pago',
  )

  const medioSeleccionado = medios.find((x) => String(x.id) === medioPagoId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-blue-800 text-white py-4 shadow print:hidden">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Trámites</h1>
            <p className="text-blue-100 text-sm">Club Atlético Estudiantes</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              to="/"
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
            >
              Consulta de cuotas
            </Link>
            <Link
              to="/login"
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 print:hidden">
            <p>{error}</p>
            {mostrarWsp && <BloqueWsp />}
          </div>
        )}

        {exito && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 print:hidden">
            <p>{exito}</p>
            {mostrarWsp && <BloqueWsp />}
          </div>
        )}

        {comprobante && (
          <section className="bg-white rounded-xl shadow-md border border-green-100 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Comprobante de trámite
            </h2>
            <p className="text-sm text-gray-600">
              Guardá o imprimí este resumen. Administración revisará la
              solicitud a la brevedad.
            </p>
            <pre className="text-sm bg-gray-50 border rounded-lg p-4 whitespace-pre-wrap font-sans">
              {comprobante.resumen}
            </pre>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                Imprimir / guardar PDF
              </button>
              <button
                type="button"
                onClick={() => setComprobante(null)}
                className="border text-sm px-4 py-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </section>
        )}

        {!tipo && !comprobante && (
          <section className="bg-white rounded-xl shadow-md p-6 space-y-4 print:hidden">
            <h2 className="text-lg font-semibold text-gray-800">
              ¿Qué trámite querés realizar?
            </h2>
            <div className="grid gap-3 sm:grid-cols-1">
              <button
                type="button"
                onClick={() => elegirTipo('alta')}
                className="text-left border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 transition"
              >
                <p className="font-semibold text-gray-900">Alta de socio</p>
                <p className="text-sm text-gray-600 mt-1">
                  Solicitud de ingreso como socio social o deportista.
                </p>
              </button>
              <button
                type="button"
                onClick={() => elegirTipo('debito_automatico')}
                className="text-left border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 transition"
              >
                <p className="font-semibold text-gray-900">
                  Solo débito automático
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Ya sos socio y querés adherirte al débito con tarjeta (sin
                  cargar datos de la tarjeta acá).
                </p>
              </button>
              <button
                type="button"
                onClick={() => elegirTipo('baja')}
                className="text-left border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 transition"
              >
                <p className="font-semibold text-gray-900">Solicitud de baja</p>
                <p className="text-sm text-gray-600 mt-1">
                  Pedido de baja de la condición de socio (queda registro para
                  administración).
                </p>
              </button>
            </div>
            <p className="text-xs text-gray-500 pt-2">
              Ante cualquier duda:{' '}
              <a
                href={WHATSAPP_SECRETARIA_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                WhatsApp {WHATSAPP_SECRETARIA_DISPLAY}
              </a>
            </p>
          </section>
        )}

        {tipo && (
          <section className="bg-white rounded-xl shadow-md p-6 print:hidden">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {tipo === 'alta'
                  ? 'Alta de socio'
                  : tipo === 'debito_automatico'
                    ? 'Débito automático'
                    : 'Solicitud de baja'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setTipo(null)
                  resetMensajes()
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Volver
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Campo
                label="Número de documento (DNI) *"
                value={documentNumber}
                onChange={setDocumentNumber}
                required
                inputMode="numeric"
              />

              {(tipo === 'alta' || tipo === 'debito_automatico') && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Campo
                    label="Apellido *"
                    value={lastName}
                    onChange={setLastName}
                    required={tipo === 'alta'}
                  />
                  <Campo
                    label="Nombre *"
                    value={firstName}
                    onChange={setFirstName}
                    required={tipo === 'alta'}
                  />
                </div>
              )}

              {tipo === 'alta' && (
                <>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de nacimiento *
                      </label>
                      <input
                        type="date"
                        required
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Género *
                      </label>
                      <select
                        required
                        value={genero}
                        onChange={(e) => setGenero(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="femenino">Femenino</option>
                        <option value="masculino">Masculino</option>
                        <option value="otro">Otro / no especifica</option>
                      </select>
                    </div>
                  </div>

                  <Campo
                    label="Celular (WhatsApp) *"
                    value={phone}
                    onChange={setPhone}
                    required
                    inputMode="tel"
                  />
                  <Campo
                    label="Teléfono alternativo"
                    value={phoneAlt}
                    onChange={setPhoneAlt}
                    inputMode="tel"
                  />
                  <Campo
                    label="Email *"
                    value={email}
                    onChange={setEmail}
                    required
                    type="email"
                  />

                  <Campo
                    label="Domicilio (calle y número) *"
                    value={domicilioCalle}
                    onChange={setDomicilioCalle}
                    required
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Campo
                      label="Localidad"
                      value={domicilioLocalidad}
                      onChange={setDomicilioLocalidad}
                    />
                    <Campo
                      label="Partido"
                      value={domicilioPartido}
                      onChange={setDomicilioPartido}
                    />
                    <Campo
                      label="Provincia"
                      value={domicilioProvincia}
                      onChange={setDomicilioProvincia}
                    />
                    <Campo
                      label="Código postal"
                      value={domicilioCp}
                      onChange={setDomicilioCp}
                    />
                  </div>

                  <Campo
                    label="N° de socio (si es reingreso o ya tenés número)"
                    value={memberNumberSugerido}
                    onChange={setMemberNumberSugerido}
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={esDeportista}
                      onChange={(e) => {
                        setEsDeportista(e.target.checked)
                        if (!e.target.checked) setDisciplinaId('')
                      }}
                    />
                    Socio deportista
                  </label>

                  {esDeportista && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Disciplina *
                      </label>
                      <select
                        required
                        value={disciplinaId}
                        onChange={(e) => setDisciplinaId(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="">Seleccionar...</option>
                        {disciplinas.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        La categoría deportiva se asigna automáticamente según
                        la edad y las reglas del club.
                      </p>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={solicitaBeca}
                      onChange={(e) => setSolicitaBeca(e.target.checked)}
                    />
                    Solicito consideración de beca por situación económica
                    (evaluación de administración)
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Forma de pago preferida *
                    </label>
                    <select
                      required
                      value={formaPago}
                      onChange={(e) => {
                        setFormaPago(e.target.value)
                        setMedioPagoId('')
                      }}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="efectivo_cobrador">
                        Efectivo / cobrador
                      </option>
                      <option value="transferencia">Transferencia</option>
                      <option value="debito_automatico">
                        Débito automático (sin cargar datos de tarjeta)
                      </option>
                    </select>
                  </div>

                  {formaPago === 'transferencia' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cuenta / medio preferido
                        </label>
                        <select
                          value={medioPagoId}
                          onChange={(e) => setMedioPagoId(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                        >
                          <option value="">Indistinto / no sé</option>
                          {mediosTransferencia.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      {medioSeleccionado &&
                        (medioSeleccionado.alias ||
                        medioSeleccionado.cbu ||
                        medioSeleccionado.cuit ||
                        medioSeleccionado.datosPago ? (
                          <div className="text-sm bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
                            <p className="font-medium text-blue-900">
                              Datos para transferir
                            </p>
                            {medioSeleccionado.alias && (
                              <p>
                                Alias:{' '}
                                <strong>{medioSeleccionado.alias}</strong>
                              </p>
                            )}
                            {medioSeleccionado.cbu && (
                              <p>
                                CBU: <strong>{medioSeleccionado.cbu}</strong>
                              </p>
                            )}
                            {medioSeleccionado.cuit && (
                              <p>
                                CUIT: <strong>{medioSeleccionado.cuit}</strong>
                              </p>
                            )}
                            {medioSeleccionado.datosPago && (
                              <p className="text-xs text-gray-700">
                                {medioSeleccionado.datosPago}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
                            Esta cuenta aún no tiene alias/CBU cargados.
                            Administración los completará en Configuración.
                          </p>
                        ))}
                    </>
                  )}

                  {formaPago === 'efectivo_cobrador' && (
                    <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={domicilioCobroDistinto}
                          onChange={(e) =>
                            setDomicilioCobroDistinto(e.target.checked)
                          }
                        />
                        El domicilio de cobro es distinto al domicilio real
                      </label>
                      {domicilioCobroDistinto && (
                        <>
                          <Campo
                            label="Domicilio de cobro (calle y número) *"
                            value={domicilioCobroCalle}
                            onChange={setDomicilioCobroCalle}
                            required
                          />
                          <Campo
                            label="Localidad de cobro"
                            value={domicilioCobroLocalidad}
                            onChange={setDomicilioCobroLocalidad}
                          />
                          <Campo
                            label="Observación de cobro"
                            value={domicilioCobroObs}
                            onChange={setDomicilioCobroObs}
                            placeholder="Horario, timbre, etc."
                          />
                        </>
                      )}
                    </div>
                  )}

                  {formaPago === 'debito_automatico' && (
                    <p className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                      No pedimos número de tarjeta ni fotos del plástico por
                      seguridad. Administración te contactará para completar la
                      adhesión.
                    </p>
                  )}

                  <Campo
                    label="Grupo familiar (opcional)"
                    value={grupoFamiliarNota}
                    onChange={setGrupoFamiliarNota}
                    placeholder="Ej.: cabecera Juan Pérez DNI … / armar grupo con …"
                  />
                </>
              )}

              {tipo === 'debito_automatico' && (
                <>
                  <Campo
                    label="Celular"
                    value={phone}
                    onChange={setPhone}
                    inputMode="tel"
                  />
                  <p className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    Debés figurar como socio en el sistema. No cargues datos de
                    tarjeta acá; el club gestiona la adhesión de forma segura.
                  </p>
                </>
              )}

              {tipo === 'baja' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo de la baja *
                    </label>
                    <select
                      required
                      value={motivoBaja}
                      onChange={(e) => setMotivoBaja(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {MOTIVOS_BAJA.map((m) => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detalle
                      {motivoBaja === 'otro' ? ' *' : ' (opcional)'}
                    </label>
                    <textarea
                      rows={3}
                      required={motivoBaja === 'otro'}
                      value={detalleBaja}
                      onChange={(e) => setDetalleBaja(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder={
                        motivoBaja === 'otro'
                          ? 'Contanos el motivo'
                          : 'Podés ampliar el motivo si querés'
                      }
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <p className="text-xs text-gray-500">
                La foto de carnet se habilitará en una próxima mejora. Por ahora
                el trámite se recibe sin foto.
              </p>

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg"
              >
                {enviando ? 'Enviando...' : 'Enviar trámite'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  )
}

function BloqueWsp() {
  return (
    <p className="mt-2">
      Acercate a secretaría o escribinos por{' '}
      <a
        href={WHATSAPP_SECRETARIA_URL}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue-800 underline"
      >
        WhatsApp {WHATSAPP_SECRETARIA_DISPLAY}
      </a>
      .
    </p>
  )
}

function Campo({
  label,
  value,
  onChange,
  required,
  type = 'text',
  inputMode,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  )
}