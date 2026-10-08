import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  listarPersonas,
  crearPersona,
  listarDeportesParaAlta,
  getPersona,
  actualizarPersona,
  darBajaMembresia,
} from '../../server/personas.functions'
import { previsualizarCategoriaDeportiva } from '../../server/categoria.functions'
import { getProximoNumeroSocio } from '../../server/config.functions'
import { getCurrentUser } from '../../server/auth.functions'
import { tienePermiso } from '../../lib/permisos'

export const Route = createFileRoute('/admin/personas')({
  component: PersonasPage,
})

type SortKey =
  | 'documentNumber'
  | 'memberNumber'
  | 'lastName'
  | 'firstName'
  | 'deporte'
  | 'category'

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
  const [puedeEditar, setPuedeEditar] = useState(false)

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

  const [filtro, setFiltro] = useState('')
  const [detalleOpen, setDetalleOpen] = useState(false)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [detalle, setDetalle] = useState<{
    persona: any
    membresia: any
    inscripcion: any
  } | null>(null)

  const [fechaBaja, setFechaBaja] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [motivoBaja, setMotivoBaja] = useState('')

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
    void (async () => {
      try {
        const u = await getCurrentUser()
        if (u) setPuedeEditar(tienePermiso(u, 'personas', 'editar'))
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

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

    void calcularCategoria()
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
    void cargar()
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
    setFechaBaja(new Date().toISOString().slice(0, 10))
    setMotivoBaja('')
  }

  const cerrarModal = () => {
    resetForm()
    setShowForm(false)
    setError('')
  }

  const abrirNueva = () => {
    if (!puedeEditar) return
    resetForm()
    setOkMsg('')
    setError('')
    setShowForm(true)
  }

  const abrirEditar = async (id: number) => {
    if (!puedeEditar) {
      setError('No tenés permiso para editar personas')
      return
    }
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
    setSubcategoriaCuota((res.membresia?.subcategoriaCuota as any) || 'pleno')
    setSubcategoriaCuotaDeporte(
      (res.inscripcion?.subcategoriaCuota as any) || 'pleno',
    )
    setMemberNumberShow(res.membresia?.memberNumber || '')
    setDisciplinaId(res.inscripcion?.disciplinaId || '')
    setFechaBaja(new Date().toISOString().slice(0, 10))
    setMotivoBaja('')
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
      setFechaBaja(new Date().toISOString().slice(0, 10))
      setMotivoBaja('')
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
    if (!puedeEditar || !detalle?.persona?.id) return
    const id = detalle.persona.id
    cerrarDetalle()
    void abrirEditar(id)
  }

  const handleBaja = async (personId: number) => {
    if (!puedeEditar) return
    if (
      !confirm(
        `¿Confirmar baja de socio con fecha ${fechaBaja}? No entrará en generaciones nuevas de cuotas.`,
      )
    ) {
      return
    }
    setError('')
    setOkMsg('')
    try {
      const res = await darBajaMembresia({
        data: {
          personId,
          fechaBaja,
          motivo: motivoBaja || 'Baja de socio',
        },
      })
      if (!res.ok) setError(res.error)
      else {
        setOkMsg(res.mensaje)
        setDetalleOpen(false)
        setDetalle(null)
        setShowForm(false)
        await cargar()
      }
    } catch (e) {
      console.error(e)
      setError('Error al registrar la baja')
    }
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!puedeEditar) {
      setError('No tenés permiso para editar personas')
      return
    }
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

  const personasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    let lista = [...personas]
    if (q) {
      lista = lista.filter((p) => {
        if (digits && String(p.documentNumber || '').includes(digits))
          return true
        if (digits && String(p.memberNumber || '').includes(digits)) return true
        if (String(p.lastName || '').toLowerCase().includes(q)) return true
        if (String(p.firstName || '').toLowerCase().includes(q)) return true
        if (
          `${p.lastName || ''} ${p.firstName || ''}`
            .toLowerCase()
            .includes(q)
        )
          return true
        return false
      })
    }
    lista.sort((a, b) => {
      const valorA = a[sortKey] ?? ''
      const valorB = b[sortKey] ?? ''
      const cmp = String(valorA).localeCompare(String(valorB), 'es', {
        sensitivity: 'base',
        numeric: true,
      })
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return lista
  }, [personas, filtro, sortKey, sortDirection])

  const sortMark = (key: SortKey) =>
    sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Personas / socios</h2>
          <p className="text-sm text-gray-500">
            Click en una fila para ver la ficha.
            {puedeEditar
              ? ` Próximo n° socio: ${proximoNumero ?? '—'}`
              : ' (solo consulta)'}
          </p>
        </div>
        {puedeEditar && (
          <button
            type="button"
            onClick={abrirNueva}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            Nueva persona
          </button>
        )}
      </div>

      {okMsg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {okMsg}
        </div>
      )}
      {error && !showForm && !detalleOpen && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por DNI, n° socio o apellido..."
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
        />
        <span className="text-xs text-gray-500">
          {personasFiltradas.length} resultado(s)
        </span>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando...</p>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600 sticky top-0">
                <tr>
                  <th
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => ordenarPor('lastName')}
                  >
                    Apellido{sortMark('lastName')}
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => ordenarPor('firstName')}
                  >
                    Nombre{sortMark('firstName')}
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => ordenarPor('documentNumber')}
                  >
                    DNI{sortMark('documentNumber')}
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => ordenarPor('memberNumber')}
                  >
                    Socio{sortMark('memberNumber')}
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => ordenarPor('category')}
                  >
                    Cat.{sortMark('category')}
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => ordenarPor('deporte')}
                  >
                    Deporte{sortMark('deporte')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {personasFiltradas.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t hover:bg-blue-50 cursor-pointer"
                    onClick={() => void abrirDetalle(p.id)}
                  >
                    <td className="px-3 py-2 font-medium">{p.lastName}</td>
                    <td className="px-3 py-2">{p.firstName}</td>
                    <td className="px-3 py-2">{p.documentNumber}</td>
                    <td className="px-3 py-2">{p.memberNumber || '—'}</td>
                    <td className="px-3 py-2">
                      {p.memberNumber
                        ? p.deporte
                          ? `Dep. ${p.categoriaDeportiva || ''}`
                          : p.category || '—'
                        : 'No socio'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-lg font-bold text-gray-800">Ficha</h3>
              <button
                type="button"
                onClick={cerrarDetalle}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            {detalleLoading || !detalle ? (
              <p className="text-sm text-gray-500">Cargando...</p>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-gray-500">Apellido y nombre</dt>
                  <dd className="font-medium">
                    {detalle.persona.lastName}, {detalle.persona.firstName}
                  </dd>
                  <dt className="text-gray-500">DNI</dt>
                  <dd>{detalle.persona.documentNumber}</dd>
                  <dt className="text-gray-500">Nacimiento</dt>
                  <dd>{formatFechaAR(detalle.persona.birthDate)}</dd>
                  <dt className="text-gray-500">Domicilio</dt>
                  <dd>{detalle.persona.address || '—'}</dd>
                  <dt className="text-gray-500">Domicilio cobro</dt>
                  <dd>{detalle.persona.addressCobro || '—'}</dd>
                  <dt className="text-gray-500">Celular</dt>
                  <dd>{detalle.persona.phoneAlt || '—'}</dd>
                  <dt className="text-gray-500">Teléfono</dt>
                  <dd>{detalle.persona.phone || '—'}</dd>
                  <dt className="text-gray-500">Email</dt>
                  <dd>{detalle.persona.email || '—'}</dd>
                  <dt className="text-gray-500">Débito automático</dt>
                  <dd>{detalle.persona.tieneDebitoAutomatico ? 'Sí' : 'No'}</dd>
                  <dt className="text-gray-500">Beca</dt>
                  <dd>{detalle.persona.beca ? 'Sí' : 'No'}</dd>
                  <dt className="text-gray-500">N° socio</dt>
                  <dd>{detalle.membresia?.memberNumber || '—'}</dd>
                  <dt className="text-gray-500">Categoría social</dt>
                  <dd>{detalle.membresia?.category || '—'}</dd>
                  <dt className="text-gray-500">Subcat. social</dt>
                  <dd>
                    {detalle.membresia
                      ? labelSubSocial(detalle.membresia.subcategoriaCuota)
                      : '—'}
                  </dd>
                  <dt className="text-gray-500">Estado membresía</dt>
                  <dd>{detalle.membresia?.status || 'No socio'}</dd>
                  <dt className="text-gray-500">Deporte</dt>
                  <dd>
                    {detalle.inscripcion
                      ? `${detalle.inscripcion.deporte || '—'} · ${
                          detalle.inscripcion.categoriaDeportiva || '—'
                        }`
                      : '—'}
                  </dd>
                  <dt className="text-gray-500">Subcat. deporte</dt>
                  <dd>
                    {detalle.inscripcion
                      ? labelSubDeporte(detalle.inscripcion.subcategoriaCuota)
                      : '—'}
                  </dd>
                </dl>

                <div className="flex flex-wrap gap-2 pt-2">
                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={editarDesdeDetalle}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
                    >
                      Editar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={cerrarDetalle}
                    className="border px-4 py-2 rounded-lg text-sm"
                  >
                    Cerrar
                  </button>
                </div>

                {puedeEditar && detalle.membresia && (
                  <div className="border border-red-100 bg-red-50 rounded-lg p-3 space-y-2 mt-2">
                    <h4 className="text-sm font-semibold text-red-800">
                      Baja de socio
                    </h4>
                    <p className="text-xs text-gray-600">
                      Cierra la membresía y las inscripciones deportivas. No
                      entrará en generaciones nuevas de cuotas.
                    </p>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Fecha de baja
                        </label>
                        <input
                          type="date"
                          value={fechaBaja}
                          onChange={(e) => setFechaBaja(e.target.value)}
                          className="border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs text-gray-600 mb-1">
                          Motivo
                        </label>
                        <input
                          value={motivoBaja}
                          onChange={(e) => setMotivoBaja(e.target.value)}
                          className="border rounded-lg px-3 py-2 text-sm w-full"
                          placeholder="Opcional"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleBaja(detalle.persona.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg"
                      >
                        Registrar baja
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showForm && puedeEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gray-800">
                {editId != null ? 'Editar persona' : 'Nueva persona'}
              </h3>
              <button type="button" onClick={cerrarModal}>
                ✕
              </button>
            </div>
            {error && (
              <div className="mb-3 p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleGuardar} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    DNI *
                  </label>
                  <input
                    value={documentNumber}
                    onChange={(e) =>
                      setDocumentNumber(e.target.value.replace(/\D/g, ''))
                    }
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Apellido *
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Nombre *
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Fecha de nacimiento *
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Domicilio *
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Domicilio de cobro
                  </label>
                  <input
                    value={addressCobro}
                    onChange={(e) => setAddressCobro(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Celular *
                  </label>
                  <input
                    value={phoneAlt}
                    onChange={(e) =>
                      setPhoneAlt(e.target.value.replace(/\D/g, ''))
                    }
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Teléfono
                  </label>
                  <input
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ''))
                    }
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tieneDebito}
                  onChange={(e) => setTieneDebito(e.target.checked)}
                />
                Débito automático
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={beca}
                  onChange={(e) => setBeca(e.target.checked)}
                />
                Beca (cuota $0)
              </label>

              {editId == null && (
                <>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={esSocio}
                      onChange={(e) => {
                        setEsSocio(e.target.checked)
                        if (!e.target.checked) setEsDeportista(false)
                      }}
                    />
                    Es socio
                  </label>
                  {esSocio && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={esDeportista}
                        onChange={(e) => setEsDeportista(e.target.checked)}
                      />
                      Socio deportista
                    </label>
                  )}
                  {esSocio && !esDeportista && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Categoría social
                        </label>
                        <select
                          value={category}
                          onChange={(e) =>
                            setCategory(e.target.value as typeof category)
                          }
                          className="border rounded-lg px-3 py-2 text-sm w-full"
                        >
                          <option value="menor">Menor</option>
                          <option value="cadete">Cadete</option>
                          <option value="activo">Activo</option>
                          <option value="vitalicio">Vitalicio</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Subcategoría
                        </label>
                        <select
                          value={subcategoriaCuota}
                          onChange={(e) =>
                            setSubcategoriaCuota(
                              e.target.value as typeof subcategoriaCuota,
                            )
                          }
                          className="border rounded-lg px-3 py-2 text-sm w-full"
                        >
                          <option value="pleno">Pleno</option>
                          <option value="3_familiar">3.º familiar</option>
                          <option value="4_familiar">4.º o más</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {editId != null && (
                <>
                  {!esSocio && (
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={hacerSocio}
                        onChange={(e) => setHacerSocio(e.target.checked)}
                      />
                      Dar de alta como socio
                    </label>
                  )}
                  {esSocio && (
                    <p className="text-xs text-gray-500">
                      N° socio: <strong>{memberNumberShow || '—'}</strong>
                      {esDeportista ? ' · Deportista' : ' · No deportista'}
                    </p>
                  )}
                  {esSocio && !esDeportista && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={agregarDeporte}
                        onChange={(e) => setAgregarDeporte(e.target.checked)}
                      />
                      Agregar deporte
                    </label>
                  )}
                  {esDeportista && (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={quitarDeporte}
                        onChange={(e) => setQuitarDeporte(e.target.checked)}
                      />
                      Quitar deporte (pasar a socio social)
                    </label>
                  )}
                  {esSocio && !mostrarBloqueDeporte && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Categoría social
                        </label>
                        <select
                          value={category}
                          onChange={(e) =>
                            setCategory(e.target.value as typeof category)
                          }
                          className="border rounded-lg px-3 py-2 text-sm w-full"
                        >
                          <option value="menor">Menor</option>
                          <option value="cadete">Cadete</option>
                          <option value="activo">Activo</option>
                          <option value="vitalicio">Vitalicio</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Subcategoría
                        </label>
                        <select
                          value={subcategoriaCuota}
                          onChange={(e) =>
                            setSubcategoriaCuota(
                              e.target.value as typeof subcategoriaCuota,
                            )
                          }
                          className="border rounded-lg px-3 py-2 text-sm w-full"
                        >
                          <option value="pleno">Pleno</option>
                          <option value="3_familiar">3.º familiar</option>
                          <option value="4_familiar">4.º o más</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {mostrarBloqueDeporte && (
                <div className="border rounded-lg p-3 space-y-2 bg-blue-50/50">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Deporte
                    </label>
                    <select
                      value={disciplinaId}
                      onChange={(e) =>
                        setDisciplinaId(
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {disciplinas.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Subcategoría deporte
                    </label>
                    <select
                      value={subcategoriaCuotaDeporte}
                      onChange={(e) =>
                        setSubcategoriaCuotaDeporte(
                          e.target.value as typeof subcategoriaCuotaDeporte,
                        )
                      }
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                    >
                      <option value="pleno">Deportista pleno</option>
                      <option value="2_hermano">2.º hermano</option>
                      <option value="3_hermano">3.º hermano</option>
                    </select>
                  </div>
                  {birthDate && (
                    <p className="text-xs text-gray-600">
                      Categoría social (automática):{' '}
                      <strong>{categoriaSocialPorEdad(birthDate)}</strong>
                    </p>
                  )}
                  {categoriaLoading && (
                    <p className="text-xs text-gray-500">
                      Calculando categoría deportiva...
                    </p>
                  )}
                  {categoriaError && (
                    <p className="text-xs text-red-600">{categoriaError}</p>
                  )}
                  {categoriaAutomatica && (
                    <p className="text-xs text-green-700">
                      Categoría deportiva:{' '}
                      <strong>{categoriaAutomatica.nombre}</strong>
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="border px-4 py-2 rounded-lg text-sm"
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