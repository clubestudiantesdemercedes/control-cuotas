import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  listarPersonas,
  crearPersona,
  listarDeportesParaAlta,
  getPersona,
  actualizarPersona,
} from '../../server/personas.functions'
import { previsualizarCategoriaDeportiva } from '../../server/categoria.functions'
import { getProximoNumeroSocio } from '../../server/config.functions'

export const Route = createFileRoute('/admin/personas')({
  component: PersonasPage,
})

function PersonasPage() {
  const [personas, setPersonas] = useState<any[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [proximoNumero, setProximoNumero] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [documentNumber, setDocumentNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [address, setAddress] = useState('')
  const [addressCobro, setAddressCobro] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneAlt, setPhoneAlt] = useState('')
  const [email, setEmail] = useState('')
  const [tieneDebito, setTieneDebito] = useState(false)
  const [beca, setBeca] = useState(false)
  const [esSocio, setEsSocio] = useState(true)
  const [esDeportista, setEsDeportista] = useState(false)
  const [category, setCategory] = useState<
    'menor' | 'cadete' | 'activo' | 'vitalicio'
  >('activo')
  const [subcategoriaCuota, setSubcategoriaCuota] = useState<
    'pleno' | '3_familiar' | '4_familiar'
  >('pleno')
  const [subcategoriaCuotaDeporte, setSubcategoriaCuotaDeporte] = useState<
    'pleno' | '2_hermano' | '3_hermano'
  >('pleno')
  const [disciplinaId, setDisciplinaId] = useState<number | ''>('')
  const [memberNumberShow, setMemberNumberShow] = useState('')

  const [categoriaAutomatica, setCategoriaAutomatica] = useState<{
    id: number
    nombre: string
    edadDeportiva?: number
    anioNacimiento?: number
  } | null>(null)
  const [categoriaLoading, setCategoriaLoading] = useState(false)
  const [categoriaError, setCategoriaError] = useState('')

  const [hacerSocio, setHacerSocio] = useState(false)
  const [agregarDeporte, setAgregarDeporte] = useState(false)
  const [quitarDeporte, setQuitarDeporte] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [detalle, setDetalle] = useState<{
    persona: any
    membresia: any
    inscripcion: any
  } | null>(null)

  type SortKey =
    | 'documentNumber'
    | 'memberNumber'
    | 'lastName'
    | 'firstName'
    | 'deporte'
    | 'category'

  const [sortKey, setSortKey] = useState<SortKey>('lastName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const mostrarBloqueDeporte =
    (editId == null && esSocio && esDeportista) ||
    (editId != null &&
      ((esDeportista && !quitarDeporte) || (!esDeportista && agregarDeporte)))

  function categoriaSocialPorEdad(fecha: string): string {
    if (!fecha) return '—'
    const hoy = new Date()
    const nac = new Date(fecha)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    if (edad < 12) return 'menor'
    if (edad < 18) return 'cadete'
    return 'activo'
  }

  function formatFechaAR(valor: unknown) {
    if (!valor) return '—'
    return String(valor).slice(0, 10).split('-').reverse().join('/')
  }

  function labelSubSocial(v: string | null | undefined) {
    if (v === '3_familiar') return '3.º familiar'
    if (v === '4_familiar') return '4.º familiar o superior'
    return 'Pleno'
  }

  function labelSubDeporte(v: string | null | undefined) {
    if (v === '2_hermano') return '2.º hermano'
    if (v === '3_hermano') return '3.º hermano'
    return 'Deportista pleno'
  }

  useEffect(() => {
    let cancelado = false

    async function calcularCategoria() {
      if (!mostrarBloqueDeporte || disciplinaId === '' || !birthDate) {
        setCategoriaAutomatica(null)
        setCategoriaError('')
        setCategoriaLoading(false)
        return
      }

      setCategoriaLoading(true)
      setCategoriaError('')
      setCategoriaAutomatica(null)

      try {
        const res = await previsualizarCategoriaDeportiva({
          data: {
            disciplinaId: Number(disciplinaId),
            birthDate,
          },
        })
        if (cancelado) return
        if (!res.ok) {
          setCategoriaError(res.error)
          return
        }
        setCategoriaAutomatica({
          id: res.categoria.id,
          nombre: res.categoria.nombre,
          edadDeportiva: res.edadDeportiva,
          anioNacimiento: res.anioNacimiento,
        })
      } catch (err) {
        if (!cancelado) {
          console.error(err)
          setCategoriaError('No se pudo calcular la categoría deportiva')
        }
      } finally {
        if (!cancelado) setCategoriaLoading(false)
      }
    }

    calcularCategoria()
    return () => {
      cancelado = true
    }
  }, [mostrarBloqueDeporte, disciplinaId, birthDate])

  const cargar = async () => {
    setLoading(true)
    setError('')
    try {
      const [resP, resD, resN] = await Promise.all([
        listarPersonas(),
        listarDeportesParaAlta(),
        getProximoNumeroSocio(),
      ])
      if (resP.ok) setPersonas(resP.personas)
      if (resD.ok) setDisciplinas(resD.disciplinas)
      if (resN.ok) setProximoNumero(resN.proximo)
    } catch (e) {
      console.error(e)
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const resetForm = () => {
    setEditId(null)
    setDocumentNumber('')
    setFirstName('')
    setLastName('')
    setBirthDate('')
    setAddress('')
    setAddressCobro('')
    setPhone('')
    setPhoneAlt('')
    setEmail('')
    setTieneDebito(false)
    setBeca(false)
    setEsSocio(true)
    setEsDeportista(false)
    setCategory('activo')
    setSubcategoriaCuota('pleno')
    setSubcategoriaCuotaDeporte('pleno')
    setDisciplinaId('')
    setMemberNumberShow('')
    setHacerSocio(false)
    setAgregarDeporte(false)
    setQuitarDeporte(false)
    setCategoriaAutomatica(null)
    setCategoriaError('')
  }

  const cerrarModal = () => {
    resetForm()
    setShowForm(false)
    setError('')
  }

  const abrirNueva = () => {
    resetForm()
    setOkMsg('')
    setError('')
    setShowForm(true)
  }

  const abrirEditar = async (id: number) => {
    setError('')
    setOkMsg('')
    setHacerSocio(false)
    setAgregarDeporte(false)
    setQuitarDeporte(false)

    const res = await getPersona({ data: { id } })
    if (!res.ok) {
      setError(res.error)
      return
    }

    const p = res.persona
    setEditId(p.id)
    setDocumentNumber(p.documentNumber)
    setFirstName(p.firstName)
    setLastName(p.lastName)
    setBirthDate(p.birthDate ? String(p.birthDate).slice(0, 10) : '')
    setAddress(p.address || '')
    setAddressCobro(p.addressCobro || '')
    setPhone(p.phone || '')
    setPhoneAlt(p.phoneAlt || '')
    setEmail(p.email || '')
    setTieneDebito(!!p.tieneDebitoAutomatico)
    setBeca(!!p.beca)
    setEsSocio(!!res.membresia)
    setEsDeportista(!!res.inscripcion)
    setCategory((res.membresia?.category as any) || 'activo')
    setSubcategoriaCuota(
      (res.membresia?.subcategoriaCuota as any) || 'pleno',
    )
    setSubcategoriaCuotaDeporte(
      (res.inscripcion?.subcategoriaCuota as any) || 'pleno',
    )
    setMemberNumberShow(res.membresia?.memberNumber || '')
    setDisciplinaId(res.inscripcion?.disciplinaId || '')
    setShowForm(true)
  }

  const abrirDetalle = async (id: number) => {
    setError('')
    setDetalleLoading(true)
    setDetalleOpen(true)
    setDetalle(null)
    try {
      const res = await getPersona({ data: { id } })
      if (!res.ok) {
        setError(res.error)
        setDetalleOpen(false)
        return
      }
      setDetalle({
        persona: res.persona,
        membresia: res.membresia,
        inscripcion: res.inscripcion,
      })
    } catch (e) {
      console.error(e)
      setError('No se pudo cargar el detalle')
      setDetalleOpen(false)
    } finally {
      setDetalleLoading(false)
    }
  }

  const cerrarDetalle = () => {
    setDetalleOpen(false)
    setDetalle(null)
  }

  const editarDesdeDetalle = () => {
    if (!detalle?.persona?.id) return
    const id = detalle.persona.id
    cerrarDetalle()
    void abrirEditar(id)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setOkMsg('')
    try {
      if (editId != null) {
        const quiereDeporte =
          (esDeportista && !quitarDeporte) || (!esDeportista && agregarDeporte)

        const res = await actualizarPersona({
          data: {
            id: editId,
            documentNumber,
            firstName,
            lastName,
            birthDate: birthDate || undefined,
            address: address || undefined,
            addressCobro: addressCobro || undefined,
            phone: phone || undefined,
            phoneAlt: phoneAlt || undefined,
            email: email || undefined,
            tieneDebitoAutomatico: tieneDebito,
            beca,
            hacerSocio: !esSocio && hacerSocio,
            category: quiereDeporte
              ? null
              : esSocio || hacerSocio
                ? category
                : null,
            subcategoriaCuota: quiereDeporte
              ? 'pleno'
              : esSocio || hacerSocio
                ? subcategoriaCuota
                : null,
            subcategoriaCuotaDeporte: quiereDeporte
              ? subcategoriaCuotaDeporte
              : null,
            agregarOCambiarDeporte: quiereDeporte,
            quitarDeporte: esDeportista && quitarDeporte,
            disciplinaId:
              quiereDeporte && disciplinaId !== ''
                ? Number(disciplinaId)
                : undefined,
          },
        })
        if (!res.ok) setError(res.error)
        else {
          setOkMsg('Persona actualizada')
          cerrarModal()
          await cargar()
        }
      } else {
        const res = await crearPersona({
          data: {
            documentNumber,
            firstName,
            lastName,
            birthDate: birthDate || undefined,
            address: address || undefined,
            addressCobro: addressCobro || undefined,
            phone: phone || undefined,
            phoneAlt: phoneAlt || undefined,
            email: email || undefined,
            tieneDebitoAutomatico: tieneDebito,
            beca,
            esSocio,
            esDeportista: esSocio ? esDeportista : false,
            category: esSocio && !esDeportista ? category : undefined,
            subcategoriaCuota:
              esSocio && !esDeportista ? subcategoriaCuota : undefined,
            subcategoriaCuotaDeporte:
              esSocio && esDeportista ? subcategoriaCuotaDeporte : undefined,
            disciplinaId:
              esSocio && esDeportista && disciplinaId !== ''
                ? Number(disciplinaId)
                : undefined,
          },
        })
        if (!res.ok) setError(res.error)
        else {
          setOkMsg(
            res.memberNumber
              ? `Persona guardada. N° socio asignado: ${res.memberNumber}`
              : 'Persona guardada correctamente',
          )
          cerrarModal()
          await cargar()
        }
      }
    } catch (e) {
      console.error(e)
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const ordenarPor = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((actual) => (actual === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const personasOrdenadas = useMemo(() => {
    const copia = [...personas]
    copia.sort((a, b) => {
      const valorA = a[sortKey]
      const valorB = b[sortKey]
      const vacioA = valorA == null || String(valorA).trim() === ''
      const vacioB = valorB == null || String(valorB).trim() === ''
      if (vacioA && vacioB) return 0
      if (vacioA) return 1
      if (vacioB) return -1

      let resultado = 0
      if (sortKey === 'documentNumber' || sortKey === 'memberNumber') {
        const numeroA = Number(valorA)
        const numeroB = Number(valorB)
        if (!Number.isNaN(numeroA) && !Number.isNaN(numeroB)) {
          resultado = numeroA - numeroB
        } else {
          resultado = String(valorA).localeCompare(String(valorB), 'es', {
            numeric: true,
            sensitivity: 'base',
          })
        }
      } else {
        resultado = String(valorA).localeCompare(String(valorB), 'es', {
          numeric: true,
          sensitivity: 'base',
        })
      }
      return sortDirection === 'asc' ? resultado : -resultado
    })
    return copia
  }, [personas, sortKey, sortDirection])

  const personasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return personasOrdenadas
    const qDigits = q.replace(/\D/g, '')

    return personasOrdenadas.filter((p) => {
      if (qDigits && String(p.documentNumber || '').includes(qDigits)) {
        return true
      }
      if (qDigits && String(p.memberNumber || '').includes(qDigits)) {
        return true
      }
      const ape = String(p.lastName || '').toLowerCase()
      const nom = String(p.firstName || '').toLowerCase()
      if (ape.includes(q) || nom.includes(q)) return true
      if (`${ape} ${nom}`.includes(q) || `${nom} ${ape}`.includes(q)) {
        return true
      }
      return false
    })
  }, [personasOrdenadas, busqueda])

  const encabezadoOrdenable = (key: SortKey, label: string) => {
    const activo = sortKey === key
    const flecha = activo ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''
    return (
      <button
        type="button"
        onClick={() => ordenarPor(key)}
        className="font-semibold hover:text-blue-600 whitespace-nowrap"
      >
        {label}
        {flecha}
      </button>
    )
  }

  const selectSubSocial = (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Subcategoría de cuota
      </label>
      <select
        value={subcategoriaCuota}
        onChange={(e) =>
          setSubcategoriaCuota(
            e.target.value as 'pleno' | '3_familiar' | '4_familiar',
          )
        }
        className="w-full border rounded-lg px-3 py-2 text-sm"
      >
        <option value="pleno">Pleno (valor normal)</option>
        <option value="3_familiar">3.º familiar</option>
        <option value="4_familiar">4.º familiar o superior</option>
      </select>
    </div>
  )

  const bloqueDeporteUI = (
    <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
      <p className="text-xs text-blue-800">
        La categoría deportiva se determina automáticamente según el deporte y
        la fecha de nacimiento.
      </p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Deporte
        </label>
        <select
          value={disciplinaId}
          onChange={(e) => {
            setDisciplinaId(e.target.value ? Number(e.target.value) : '')
            setCategoriaAutomatica(null)
            setCategoriaError('')
          }}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          required={mostrarBloqueDeporte}
        >
          <option value="">Elegir...</option>
          {disciplinas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Categoría deportiva
        </label>
        {categoriaLoading && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Calculando categoría...
          </div>
        )}
        {!categoriaLoading && categoriaAutomatica && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <div className="text-sm font-semibold text-green-800">
              {categoriaAutomatica.nombre}
            </div>
            {categoriaAutomatica.edadDeportiva != null && (
              <div className="text-xs text-green-700 mt-1">
                Edad deportiva: {categoriaAutomatica.edadDeportiva} años
              </div>
            )}
            {categoriaAutomatica.anioNacimiento != null && (
              <div className="text-xs text-green-700">
                Año de nacimiento: {categoriaAutomatica.anioNacimiento}
              </div>
            )}
          </div>
        )}
        {!categoriaLoading && categoriaError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {categoriaError}
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Subcategoría cuota deportiva
        </label>
        <select
          value={subcategoriaCuotaDeporte}
          onChange={(e) =>
            setSubcategoriaCuotaDeporte(
              e.target.value as 'pleno' | '2_hermano' | '3_hermano',
            )
          }
          className="w-full border rounded-lg px-3 py-2 text-sm"
        >
          <option value="pleno">Deportista pleno</option>
          <option value="2_hermano">2.º hermano</option>
          <option value="3_hermano">3.º hermano</option>
        </select>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Personas</h2>
          <p className="text-sm text-gray-500">
            Alta, edición, socio / deportista
            {proximoNumero != null ? ` · Próximo n° socio: ${proximoNumero}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNueva}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg"
        >
          Nueva persona
        </button>
      </div>

      {error && !showForm && !detalleOpen && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {okMsg}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2 items-center">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por DNI, n° socio, apellido o nombre..."
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px] max-w-md"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="text-sm text-gray-600 hover:underline"
          >
            Limpiar
          </button>
        )}
        <span className="text-xs text-gray-500">
          {personasFiltradas.length} de {personas.length}
        </span>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando...</p>
        ) : personasFiltradas.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            {busqueda
              ? 'No hay resultados para la búsqueda.'
              : 'No hay personas cargadas.'}
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600 sticky top-0">
                <tr>
                  <th className="px-3 py-2">
                    {encabezadoOrdenable('lastName', 'Apellido')}
                  </th>
                  <th className="px-3 py-2">
                    {encabezadoOrdenable('firstName', 'Nombre')}
                  </th>
                  <th className="px-3 py-2">
                    {encabezadoOrdenable('documentNumber', 'DNI')}
                  </th>
                  <th className="px-3 py-2">
                    {encabezadoOrdenable('memberNumber', 'N° socio')}
                  </th>
                  <th className="px-3 py-2">
                    {encabezadoOrdenable('category', 'Cat. social')}
                  </th>
                  <th className="px-3 py-2">
                    {encabezadoOrdenable('deporte', 'Deporte')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {personasFiltradas.map((p) => (
                  <tr
                    key={`${p.id}-${p.deporte || ''}-${p.categoriaDeportiva || ''}`}
                    className="border-t hover:bg-blue-50 cursor-pointer"
                    onClick={() => abrirDetalle(p.id)}
                  >
                    <td className="px-3 py-2 font-medium">{p.lastName}</td>
                    <td className="px-3 py-2">{p.firstName}</td>
                    <td className="px-3 py-2">{p.documentNumber}</td>
                    <td className="px-3 py-2">{p.memberNumber ?? '—'}</td>
                    <td className="px-3 py-2">
                      {p.category ? (
                        p.category
                      ) : (
                        <span className="text-gray-400">No socio</span>
                      )}
                      {p.beca ? (
                        <span className="ml-1 text-xs text-amber-700">· beca</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {p.deporte
                        ? `${p.deporte}${
                            p.categoriaDeportiva
                              ? ` · ${p.categoriaDeportiva}`
                              : ''
                          }`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detalleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={cerrarDetalle}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Ficha de persona</h3>
              <button
                type="button"
                onClick={cerrarDetalle}
                className="text-gray-500 hover:text-gray-800 text-sm px-2 py-1"
              >
                Cerrar
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {detalleLoading && <p className="text-gray-500">Cargando...</p>}
              {!detalleLoading && detalle && (
                <>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {detalle.persona.lastName}, {detalle.persona.firstName}
                    </p>
                    <p className="text-gray-600">
                      DNI {detalle.persona.documentNumber}
                      {detalle.membresia?.memberNumber
                        ? ` · Socio n° ${detalle.membresia.memberNumber}`
                        : ' · No socio'}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Datos personales
                    </p>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <dt className="text-xs text-gray-500">Nacimiento</dt>
                        <dd>{formatFechaAR(detalle.persona.birthDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Beca</dt>
                        <dd>{detalle.persona.beca ? 'Sí (cuota $0)' : 'No'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-gray-500">Domicilio</dt>
                        <dd>{detalle.persona.address || '—'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-gray-500">Domicilio cobro</dt>
                        <dd>
                          {detalle.persona.addressCobro ||
                            detalle.persona.address ||
                            '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Celular</dt>
                        <dd>{detalle.persona.phoneAlt || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Tel. fijo</dt>
                        <dd>{detalle.persona.phone || '—'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-gray-500">Email</dt>
                        <dd>{detalle.persona.email || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Débito automático</dt>
                        <dd>
                          {detalle.persona.tieneDebitoAutomatico ? 'Sí' : 'No'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Situación de socio
                    </p>
                    {detalle.membresia ? (
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">N° de socio</dt>
                          <dd>{detalle.membresia.memberNumber ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Categoría social</dt>
                          <dd className="capitalize">
                            {detalle.membresia.category ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">
                            Subcategoría cuota
                          </dt>
                          <dd>
                            {labelSubSocial(detalle.membresia.subcategoriaCuota)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Alta desde</dt>
                          <dd>{formatFechaAR(detalle.membresia.startDate)}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-gray-600">No es socio del club.</p>
                    )}
                  </div>

                  <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Actividad deportiva
                    </p>
                    {detalle.inscripcion ? (
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Deporte</dt>
                          <dd>{detalle.inscripcion.deporte ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">
                            Categoría deportiva
                          </dt>
                          <dd>
                            {detalle.inscripcion.categoriaDeportiva ?? '—'}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-gray-500">
                            Subcategoría cuota deportiva
                          </dt>
                          <dd>
                            {labelSubDeporte(
                              detalle.inscripcion.subcategoriaCuota,
                            )}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-gray-600">
                        Sin inscripción deportiva activa.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={editarDesdeDetalle}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={cerrarDetalle}
                      className="border text-sm px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={cerrarModal}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                {editId != null ? `Editar persona #${editId}` : 'Nueva persona'}
              </h3>
              <button
                type="button"
                onClick={cerrarModal}
                className="text-gray-500 hover:text-gray-800 text-sm px-2 py-1"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-4 space-y-3">
              {error && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {editId != null && memberNumberShow && (
                <p className="text-sm text-gray-600">
                  N° socio: <strong>{memberNumberShow}</strong>
                </p>
              )}
              {editId == null && esSocio && proximoNumero != null && (
                <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-2">
                  Se asignará automáticamente el n° de socio{' '}
                  <strong>{proximoNumero}</strong>
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    DNI *
                  </label>
                  <input
                    value={documentNumber}
                    onChange={(e) =>
                      setDocumentNumber(
                        e.target.value.replace(/\D/g, '').slice(0, 8),
                      )
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                    inputMode="numeric"
                    minLength={7}
                    maxLength={8}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fecha nacimiento *
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Apellido *
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nombre *
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Domicilio *
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Domicilio de cobro
                  </label>
                  <input
                    value={addressCobro}
                    onChange={(e) => setAddressCobro(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tel. fijo
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Celular *
                  </label>
                  <input
                    value={phoneAlt}
                    onChange={(e) =>
                      setPhoneAlt(e.target.value.replace(/\D/g, '').slice(0, 13))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                    inputMode="numeric"
                    placeholder="Ej. 2324123456"
                    minLength={10}
                    maxLength={13}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="opcional"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tieneDebito}
                  onChange={(e) => setTieneDebito(e.target.checked)}
                />
                Débito automático (descuento)
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={beca}
                  onChange={(e) => setBeca(e.target.checked)}
                />
                Beca (cuota generada en $0)
              </label>

              {editId == null && (
                <div className="border-t pt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={esSocio}
                      onChange={(e) => {
                        setEsSocio(e.target.checked)
                        if (!e.target.checked) setEsDeportista(false)
                      }}
                    />
                    Es socio del club
                  </label>

                  {esSocio && (
                    <>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={esDeportista}
                          onChange={(e) => setEsDeportista(e.target.checked)}
                        />
                        Practica deporte
                      </label>

                      {!esDeportista && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Categoría social
                            </label>
                            <select
                              value={category}
                              onChange={(e) =>
                                setCategory(
                                  e.target.value as
                                    | 'menor'
                                    | 'cadete'
                                    | 'activo'
                                    | 'vitalicio',
                                )
                              }
                              className="w-full border rounded-lg px-3 py-2 text-sm"
                              required
                            >
                              <option value="menor">Menor</option>
                              <option value="cadete">Cadete</option>
                              <option value="activo">Activo</option>
                              <option value="vitalicio">Vitalicio</option>
                            </select>
                          </div>
                          {(category === 'cadete' || category === 'activo') &&
                            selectSubSocial}
                        </>
                      )}

                      {esDeportista && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                          <span className="text-gray-600">
                            Categoría social (automática):{' '}
                          </span>
                          <strong>{categoriaSocialPorEdad(birthDate)}</strong>
                        </div>
                      )}

                      {esDeportista && bloqueDeporteUI}
                    </>
                  )}
                </div>
              )}

              {editId != null && (
                <div className="border-t pt-3 space-y-2">
                  {!esSocio && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={hacerSocio}
                        onChange={(e) => setHacerSocio(e.target.checked)}
                      />
                      Dar de alta como socio
                    </label>
                  )}

                  {(esSocio || hacerSocio) &&
                    !esDeportista &&
                    !agregarDeporte && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Categoría social
                          </label>
                          <select
                            value={category}
                            onChange={(e) =>
                              setCategory(
                                e.target.value as
                                  | 'menor'
                                  | 'cadete'
                                  | 'activo'
                                  | 'vitalicio',
                              )
                            }
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="menor">Menor</option>
                            <option value="cadete">Cadete</option>
                            <option value="activo">Activo</option>
                            <option value="vitalicio">Vitalicio</option>
                          </select>
                        </div>
                        {(category === 'cadete' || category === 'activo') &&
                          selectSubSocial}
                      </>
                    )}

                  {esSocio && esDeportista && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={quitarDeporte}
                        onChange={(e) => {
                          setQuitarDeporte(e.target.checked)
                          if (e.target.checked) setAgregarDeporte(false)
                        }}
                      />
                      Quitar deporte (pasar a socio social)
                    </label>
                  )}

                  {esSocio && !esDeportista && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={agregarDeporte}
                        onChange={(e) => {
                          setAgregarDeporte(e.target.checked)
                          if (e.target.checked) setQuitarDeporte(false)
                        }}
                      />
                      Agregar deporte
                    </label>
                  )}

                  {mostrarBloqueDeporte && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                      <span className="text-gray-600">
                        Categoría social (automática):{' '}
                      </span>
                      <strong>{categoriaSocialPorEdad(birthDate)}</strong>
                    </div>
                  )}

                  {mostrarBloqueDeporte && bloqueDeporteUI}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
                >
                  {saving
                    ? 'Guardando...'
                    : editId != null
                      ? 'Actualizar'
                      : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="border text-sm px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}