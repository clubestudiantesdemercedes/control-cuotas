import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  listarPersonas,
  crearPersona,
  listarDeportesParaAlta,
  getPersona,
  actualizarPersona,
} from '../../server/personas.functions'
import { getProximoNumeroSocio } from '../../server/config.functions'

export const Route = createFileRoute('/admin/personas')({
  component: PersonasPage,
})

function PersonasPage() {
  const [personas, setPersonas] = useState<any[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
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
  const [tieneDebito, setTieneDebito] = useState(false)
  const [esSocio, setEsSocio] = useState(true)
  const [esDeportista, setEsDeportista] = useState(false)
  const [category, setCategory] = useState<'menor' | 'cadete' | 'activo' | 'vitalicio'>('activo')
  const [disciplinaId, setDisciplinaId] = useState<number | ''>('')
  const [categoriaDeportivaId, setCategoriaDeportivaId] = useState<number | ''>('')
  const [memberNumberShow, setMemberNumberShow] = useState('')

  // Solo al editar
  const [hacerSocio, setHacerSocio] = useState(false)
  const [agregarDeporte, setAgregarDeporte] = useState(false)
  const [quitarDeporte, setQuitarDeporte] = useState(false)

  const categoriasFiltradas = categorias.filter(
    (c) => disciplinaId !== '' && c.disciplinaId === disciplinaId,
  )

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
      if (resD.ok) {
        setDisciplinas(resD.disciplinas)
        setCategorias(resD.categorias)
      }
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
    setTieneDebito(false)
    setEsSocio(true)
    setEsDeportista(false)
    setCategory('activo')
    setDisciplinaId('')
    setCategoriaDeportivaId('')
    setMemberNumberShow('')
    setHacerSocio(false)
    setAgregarDeporte(false)
    setQuitarDeporte(false)
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
    setTieneDebito(!!p.tieneDebitoAutomatico)
    setEsSocio(!!res.membresia)
    setEsDeportista(!!res.inscripcion)
    setCategory((res.membresia?.category as any) || 'activo')
    setMemberNumberShow(res.membresia?.memberNumber || '')
    setDisciplinaId(res.inscripcion?.disciplinaId || '')
    setCategoriaDeportivaId(res.inscripcion?.categoriaDeportivaId || '')
    setShowForm(true)
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
            tieneDebitoAutomatico: tieneDebito,
            hacerSocio: !esSocio && hacerSocio,
            category: esSocio || hacerSocio ? category : null,
            agregarOCambiarDeporte: quiereDeporte,
            quitarDeporte: esDeportista && quitarDeporte,
            disciplinaId:
              quiereDeporte && disciplinaId !== '' ? Number(disciplinaId) : undefined,
            categoriaDeportivaId:
              quiereDeporte && categoriaDeportivaId !== ''
                ? Number(categoriaDeportivaId)
                : undefined,
          },
        })
        if (!res.ok) setError(res.error)
        else {
          setOkMsg('Persona actualizada')
          resetForm()
          setShowForm(false)
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
            tieneDebitoAutomatico: tieneDebito,
            esSocio,
            esDeportista: esSocio ? esDeportista : false,
            category: esSocio && !esDeportista ? category : undefined,
            disciplinaId:
              esSocio && esDeportista && disciplinaId !== ''
                ? Number(disciplinaId)
                : undefined,
            categoriaDeportivaId:
              esSocio && esDeportista && categoriaDeportivaId !== ''
                ? Number(categoriaDeportivaId)
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
          resetForm()
          setShowForm(false)
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

  const mostrarSelectsDeporte =
    (editId == null && esSocio && esDeportista) ||
    (editId != null &&
      ((esDeportista && !quitarDeporte) ||
        (!esDeportista && (esSocio || hacerSocio) && agregarDeporte)))

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
          onClick={() => {
            resetForm()
            setShowForm((v) => !v)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg"
        >
          {showForm ? 'Cerrar formulario' : 'Nueva persona'}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {okMsg}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleGuardar}
          className="mb-6 bg-white border rounded-xl p-4 shadow-sm space-y-3 max-w-2xl"
        >
          <h3 className="font-semibold text-gray-800">
            {editId != null ? `Editar persona #${editId}` : 'Nueva persona'}
          </h3>

          {editId != null && memberNumberShow && (
            <p className="text-sm text-gray-600">
              N° socio: <strong>{memberNumberShow}</strong>
            </p>
          )}
          {editId == null && esSocio && proximoNumero != null && (
            <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-2">
              Se asignará automáticamente el n° de socio <strong>{proximoNumero}</strong>
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">DNI</label>
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fecha nacimiento
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Domicilio</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Tel. fijo</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
              <input
                value={phoneAlt}
                onChange={(e) => setPhoneAlt(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
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

          {/* ——— ALTA NUEVA ——— */}
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
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Categoría social
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full border rounded-lg px-3 py-2 text-sm max-w-xs"
                      >
                        <option value="menor">Menor</option>
                        <option value="cadete">Cadete</option>
                        <option value="activo">Activo</option>
                        <option value="vitalicio">Vitalicio</option>
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ——— EDICIÓN ——— */}
          {editId != null && (
            <div className="border-t pt-3 space-y-3">
              {!esSocio && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hacerSocio}
                    onChange={(e) => setHacerSocio(e.target.checked)}
                  />
                  Dar de alta como socio (asigna n° automático)
                </label>
              )}

              {(esSocio || hacerSocio) && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Categoría social
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full border rounded-lg px-3 py-2 text-sm max-w-xs"
                    >
                      <option value="menor">Menor</option>
                      <option value="cadete">Cadete</option>
                      <option value="activo">Activo</option>
                      <option value="vitalicio">Vitalicio</option>
                    </select>
                  </div>

                  {esDeportista ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={quitarDeporte}
                        onChange={(e) => setQuitarDeporte(e.target.checked)}
                      />
                      Quitar deporte (queda socio no deportista)
                    </label>
                  ) : (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={agregarDeporte}
                        onChange={(e) => setAgregarDeporte(e.target.checked)}
                      />
                      Agregar deporte
                    </label>
                  )}
                </>
              )}
            </div>
          )}

          {/* Selects deporte (alta o edición) */}
          {mostrarSelectsDeporte && (
            <div className="space-y-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                {editId == null
                  ? 'Categoría social automática por fecha de nacimiento.'
                  : 'Elegí deporte y categoría deportiva.'}
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deporte</label>
                <select
                  value={disciplinaId}
                  onChange={(e) => {
                    setDisciplinaId(e.target.value ? Number(e.target.value) : '')
                    setCategoriaDeportivaId('')
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                >
                  <option value="">Elegir…</option>
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
                <select
                  value={categoriaDeportivaId}
                  onChange={(e) =>
                    setCategoriaDeportivaId(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                  disabled={disciplinaId === ''}
                >
                  <option value="">Elegir…</option>
                  {categoriasFiltradas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-4 py-2 rounded-lg"
          >
            {saving ? 'Guardando...' : editId != null ? 'Actualizar' : 'Guardar'}
          </button>
        </form>
      )}

      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando...</p>
        ) : personas.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No hay personas cargadas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Apellido y nombre</th>
                <th className="px-3 py-2">DNI</th>
                <th className="px-3 py-2">N° socio</th>
                <th className="px-3 py-2">Cat. social</th>
                <th className="px-3 py-2">Deporte</th>
                <th className="px-3 py-2">Débito</th>
                <th className="px-3 py-2">Celular</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {personas.map((p) => (
                <tr
                  key={`${p.id}-${p.deporte || ''}-${p.categoriaDeportiva || ''}`}
                  className="border-t"
                >
                  <td className="px-3 py-2 font-medium">
                    {p.lastName}, {p.firstName}
                  </td>
                  <td className="px-3 py-2">{p.documentNumber}</td>
                  <td className="px-3 py-2">{p.memberNumber ?? '—'}</td>
                  <td className="px-3 py-2">
                    {p.category ? p.category : <span className="text-gray-400">No socio</span>}
                  </td>
                  <td className="px-3 py-2">
                    {p.deporte
                      ? `${p.deporte}${p.categoriaDeportiva ? ` · ${p.categoriaDeportiva}` : ''}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2">{p.tieneDebitoAutomatico ? 'Sí' : '—'}</td>
                  <td className="px-3 py-2">{p.phoneAlt ?? '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => abrirEditar(p.id)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}