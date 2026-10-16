import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { requireUser } from './auth.server'
import { mensajeContactoSecretaria } from '../lib/contacto-club'
import { categoriaSocialPorEdad } from '../lib/categoria-social'
import { resolverCategoriaDeportiva } from './deportes.server'

const MOTIVOS_BAJA_OK = [
  'cese_actividad_deportiva',
  'baja_socio',
  'problemas_economicos',
  'mudanza',
  'salud',
  'disconformidad',
  'otro',
] as const

function soloDigitos(v: string) {
  return (v || '').replace(/\D/g, '')
}

function normalizarTexto(v?: string | null) {
  const t = (v || '').trim()
  return t.length ? t : null
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function resolverCategoriaSocialAlta(params: {
  birthDate?: string | null
  esDeportista: boolean
}): 'menor' | 'cadete' | 'activo' {
  const calc = categoriaSocialPorEdad(params.birthDate, hoyISO())
  return calc || 'activo'
}

async function obtenerYReservarNumeroSocio(db: any, clubConfig: any) {
  const rows = await db
    .select()
    .from(clubConfig)
    .where(eq(clubConfig.key, 'ultimo_numero_socio'))
    .limit(1)

  const ultimo = rows[0] ? Number(rows[0].value) || 0 : 0
  const proximo = ultimo + 1
  const value = String(proximo)

  if (rows[0]) {
    await db
      .update(clubConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(clubConfig.key, 'ultimo_numero_socio'))
  } else {
    await db.insert(clubConfig).values({
      key: 'ultimo_numero_socio',
      value,
      updatedAt: new Date(),
    })
  }

  return value
}

export const listarDisciplinasActivasPublico = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { db } = await import('../../db')
  const { disciplinas } = await import('../../db/schema')
  const rows = await db
    .select({ id: disciplinas.id, nombre: disciplinas.nombre })
    .from(disciplinas)
    .where(eq(disciplinas.activa, true))
    .orderBy(disciplinas.nombre)
  return { ok: true as const, disciplinas: rows }
})

export const listarMediosPagoPublico = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { db } = await import('../../db')
    const { mediosPago } = await import('../../db/schema')
    const rows = await db
      .select({
        id: mediosPago.id,
        nombre: mediosPago.nombre,
        tipo: mediosPago.tipo,
        orden: mediosPago.orden,
        alias: mediosPago.alias,
        cbu: mediosPago.cbu,
        cuit: (mediosPago as any).cuit,
        datosPago: mediosPago.datosPago,
        esDefaultSocial: (mediosPago as any).esDefaultSocial,
        disciplinaId: (mediosPago as any).disciplinaId,
      })
      .from(mediosPago)
      .where(eq(mediosPago.activa, true))
      .orderBy(mediosPago.orden, mediosPago.nombre)
    return { ok: true as const, medios: rows }
  },
)

type CrearSolicitudInput = {
  tipo: 'alta' | 'debito_automatico' | 'baja'
  documentType?: string
  documentNumber: string
  lastName?: string
  firstName?: string
  birthDate?: string
  genero?: string
  phone?: string
  phoneAlt?: string
  email?: string
  domicilioCalle?: string
  domicilioLocalidad?: string
  domicilioPartido?: string
  domicilioProvincia?: string
  domicilioCp?: string
  domicilioCobroDistinto?: boolean
  domicilioCobroCalle?: string
  domicilioCobroLocalidad?: string
  domicilioCobroObs?: string
  memberNumberSugerido?: string
  esDeportista?: boolean
  disciplinaId?: number | null
  solicitaBeca?: boolean
  formaPago?: string
  medioPagoId?: number | null
  grupoFamiliarNota?: string
  fotoCarnetKey?: string
  observacionSolicitante?: string
  motivoBaja?: string
  motivoBajaCodigo?: string
}

export const crearSolicitudTramite = createServerFn({ method: 'POST' })
  .inputValidator((data: CrearSolicitudInput) => data)
  .handler(async ({ data }) => {
    const { db } = await import('../../db')
    const { solicitudesTramite, people } = await import('../../db/schema')

    const tipo = data.tipo
    if (!['alta', 'debito_automatico', 'baja'].includes(tipo)) {
      return { ok: false as const, error: 'Tipo de trámite inválido.' }
    }

    const documentNumber = soloDigitos(data.documentNumber)
    if (documentNumber.length < 7) {
      return {
        ok: false as const,
        error: 'Ingresá un número de documento válido.',
      }
    }

    const [pendiente] = await db
      .select({ id: solicitudesTramite.id })
      .from(solicitudesTramite)
      .where(
        and(
          eq(solicitudesTramite.documentNumber, documentNumber),
          eq(solicitudesTramite.estado, 'pendiente'),
        ),
      )
      .limit(1)

    if (pendiente) {
      return {
        ok: false as const,
        error: mensajeContactoSecretaria(
          'Ya hay un trámite pendiente con ese documento.',
        ),
        contactarWsp: true,
      }
    }

    const [personaExistente] = await db
      .select({
        id: people.id,
        status: people.status,
        firstName: people.firstName,
        lastName: people.lastName,
      })
      .from(people)
      .where(eq(people.documentNumber, documentNumber))
      .limit(1)

    if (tipo === 'debito_automatico' || tipo === 'baja') {
      if (!personaExistente) {
        return {
          ok: false as const,
          error: mensajeContactoSecretaria(
            'No encontramos un socio con ese documento.',
          ),
          contactarWsp: true,
        }
      }
    }

    if (tipo === 'alta') {
      const lastName = (data.lastName || '').trim()
      const firstName = (data.firstName || '').trim()
      if (!lastName || !firstName) {
        return {
          ok: false as const,
          error: 'Apellido y nombre son obligatorios.',
        }
      }
      if (!data.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)) {
        return {
          ok: false as const,
          error: 'Fecha de nacimiento inválida.',
        }
      }
      if (!(data.genero || '').trim()) {
        return { ok: false as const, error: 'El género es obligatorio.' }
      }
      const phone = soloDigitos(data.phone || '')
      if (phone.length < 8) {
        return {
          ok: false as const,
          error: 'Ingresá un celular válido para WhatsApp.',
        }
      }
      const email = (data.email || '').trim()
      if (!email || !email.includes('@')) {
        return { ok: false as const, error: 'Ingresá un email válido.' }
      }
      if (!(data.domicilioCalle || '').trim()) {
        return {
          ok: false as const,
          error: 'Calle y número son obligatorios.',
        }
      }
      if (data.esDeportista && !data.disciplinaId) {
        return {
          ok: false as const,
          error: 'Elegí la disciplina deportiva.',
        }
      }
      if (!data.formaPago) {
        return {
          ok: false as const,
          error: 'Elegí una forma de pago preferida.',
        }
      }
      if (
        data.formaPago === 'efectivo_cobrador' &&
        data.domicilioCobroDistinto &&
        !(data.domicilioCobroCalle || '').trim()
      ) {
        return {
          ok: false as const,
          error: 'Indicá el domicilio de cobro.',
        }
      }
    }

    if (tipo === 'baja') {
      const codigo = (data.motivoBajaCodigo || '').trim()
      if (!(MOTIVOS_BAJA_OK as readonly string[]).includes(codigo)) {
        return {
          ok: false as const,
          error: 'Elegí un motivo de baja de la lista.',
        }
      }
      const motivo = (data.motivoBaja || '').trim()
      if (motivo.length < 3) {
        return {
          ok: false as const,
          error: 'Completá el motivo de la baja.',
        }
      }
    }

    const lastName =
      (data.lastName || '').trim() ||
      personaExistente?.lastName ||
      '—'
    const firstName =
      (data.firstName || '').trim() ||
      personaExistente?.firstName ||
      '—'

    const [row] = await db
      .insert(solicitudesTramite)
      .values({
        tipo,
        estado: 'pendiente',
        documentType: (data.documentType || 'DNI').trim() || 'DNI',
        documentNumber,
        lastName,
        firstName,
        birthDate: data.birthDate || null,
        genero: normalizarTexto(data.genero),
        phone: normalizarTexto(data.phone),
        phoneAlt: normalizarTexto(data.phoneAlt),
        email: normalizarTexto(data.email),
        domicilioCalle: normalizarTexto(data.domicilioCalle),
        domicilioLocalidad: normalizarTexto(data.domicilioLocalidad),
        domicilioPartido: normalizarTexto(data.domicilioPartido),
        domicilioProvincia: normalizarTexto(data.domicilioProvincia),
        domicilioCp: normalizarTexto(data.domicilioCp),
        domicilioCobroDistinto: !!data.domicilioCobroDistinto,
        domicilioCobroCalle: normalizarTexto(data.domicilioCobroCalle),
        domicilioCobroLocalidad: normalizarTexto(data.domicilioCobroLocalidad),
        domicilioCobroObs: normalizarTexto(data.domicilioCobroObs),
        memberNumberSugerido: normalizarTexto(data.memberNumberSugerido),
        esDeportista: !!data.esDeportista,
        disciplinaId: data.disciplinaId || null,
        solicitaBeca: !!data.solicitaBeca,
        formaPago: normalizarTexto(data.formaPago),
        medioPagoId: data.medioPagoId || null,
        grupoFamiliarNota: normalizarTexto(data.grupoFamiliarNota),
        fotoCarnetKey: normalizarTexto(data.fotoCarnetKey),
        observacionSolicitante: normalizarTexto(data.observacionSolicitante),
        motivoBaja: normalizarTexto(data.motivoBaja),
        personId: personaExistente?.id ?? null,
      })
      .returning({ id: solicitudesTramite.id })

    return {
      ok: true as const,
      id: row.id,
      mensaje:
        'Trámite recibido. Administración lo revisará a la brevedad. Si necesitás urgencia, escribinos por WhatsApp.',
      contactarWsp: true,
    }
  })

export const listarSolicitudesAdmin = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { estado?: string; tipo?: string; limit?: number }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { solicitudesTramite } = await import('../../db/schema')

    const condiciones = []
    if (data.estado) {
      condiciones.push(eq(solicitudesTramite.estado, data.estado))
    }
    if (data.tipo) {
      condiciones.push(eq(solicitudesTramite.tipo, data.tipo))
    }

    const rows = await db
      .select()
      .from(solicitudesTramite)
      .where(condiciones.length ? and(...condiciones) : undefined)
      .orderBy(desc(solicitudesTramite.createdAt))
      .limit(Math.min(data.limit ?? 100, 300))

    return { ok: true as const, solicitudes: rows }
  })

export const rechazarSolicitud = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; motivo: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('../../db')
    const { solicitudesTramite } = await import('../../db/schema')

    const motivo = (data.motivo || '').trim()
    if (motivo.length < 3) {
      return { ok: false as const, error: 'Indicá un motivo de rechazo.' }
    }

    const [row] = await db
      .select()
      .from(solicitudesTramite)
      .where(eq(solicitudesTramite.id, data.id))
      .limit(1)

    if (!row) return { ok: false as const, error: 'Solicitud no encontrada' }
    if (row.estado !== 'pendiente') {
      return { ok: false as const, error: 'La solicitud ya fue resuelta' }
    }

    await db
      .update(solicitudesTramite)
      .set({
        estado: 'rechazada',
        motivoRechazo: motivo,
        revisadoPor: user.userId,
        revisadoEn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(solicitudesTramite.id, data.id))

    return { ok: true as const }
  })

export const aprobarSolicitud = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { id: number; notasAdmin?: string; fechaBaja?: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('../../db')
    const {
      solicitudesTramite,
      people,
      memberships,
      inscripcionesDeportivas,
      clubConfig,
    } = await import('../../db/schema')

    const [sol] = await db
      .select()
      .from(solicitudesTramite)
      .where(eq(solicitudesTramite.id, data.id))
      .limit(1)

    if (!sol) return { ok: false as const, error: 'Solicitud no encontrada' }
    if (sol.estado !== 'pendiente') {
      return { ok: false as const, error: 'La solicitud ya fue resuelta' }
    }

    const hoy = hoyISO()
    let personId = sol.personId

    try {
      // ---------- DÉBITO AUTOMÁTICO ----------
      if (sol.tipo === 'debito_automatico') {
        if (!personId) {
          return {
            ok: false as const,
            error: 'No hay persona vinculada a este trámite.',
          }
        }
        await db
          .update(people)
          .set({
            tieneDebitoAutomatico: true,
            updatedAt: new Date(),
            notes: [
              // no pisamos notes largas; solo marcamos en sistema
            ].join(''),
          })
          .where(eq(people.id, personId))

        // limpiar notes vacío raro
        await db
          .update(people)
          .set({
            tieneDebitoAutomatico: true,
            updatedAt: new Date(),
          })
          .where(eq(people.id, personId))

        await db
          .update(solicitudesTramite)
          .set({
            estado: 'aprobada',
            personId,
            revisadoPor: user.userId,
            revisadoEn: new Date(),
            notasAdmin: normalizarTexto(data.notasAdmin),
            updatedAt: new Date(),
          })
          .where(eq(solicitudesTramite.id, sol.id))

        return {
          ok: true as const,
          mensaje:
            'Débito automático marcado en el socio. Completar adhesión bancaria fuera del sistema.',
          personId,
        }
      }

      // ---------- BAJA ----------
      if (sol.tipo === 'baja') {
        if (!personId) {
          return {
            ok: false as const,
            error: 'No hay persona vinculada a este trámite.',
          }
        }
        const fechaBaja =
          data.fechaBaja && /^\d{4}-\d{2}-\d{2}$/.test(data.fechaBaja)
            ? data.fechaBaja
            : hoy

        const [mem] = await db
          .select()
          .from(memberships)
          .where(
            and(
              eq(memberships.personId, personId),
              eq(memberships.status, 'activo'),
              isNull(memberships.endDate),
            ),
          )
          .limit(1)

        if (mem) {
          await db
            .update(memberships)
            .set({
              status: 'baja',
              endDate: fechaBaja,
              endReason: sol.motivoBaja || 'Baja solicitada por web',
              updatedAt: new Date(),
            })
            .where(eq(memberships.id, mem.id))
        }

        await db
          .update(inscripcionesDeportivas)
          .set({ activa: false, fechaFin: fechaBaja })
          .where(
            and(
              eq(inscripcionesDeportivas.personId, personId),
              eq(inscripcionesDeportivas.activa, true),
            ),
          )

        await db
          .update(people)
          .set({ status: 'inactivo', updatedAt: new Date() })
          .where(eq(people.id, personId))

        await db
          .update(solicitudesTramite)
          .set({
            estado: 'aprobada',
            personId,
            revisadoPor: user.userId,
            revisadoEn: new Date(),
            notasAdmin: normalizarTexto(data.notasAdmin),
            updatedAt: new Date(),
          })
          .where(eq(solicitudesTramite.id, sol.id))

        return {
          ok: true as const,
          mensaje: `Baja aprobada con fecha ${fechaBaja}.`,
          personId,
        }
      }

      // ---------- ALTA ----------
      if (sol.tipo === 'alta') {
        const esDeportista = !!sol.esDeportista
        const birthDate = sol.birthDate
          ? String(sol.birthDate).slice(0, 10)
          : null

        if (!birthDate) {
          return {
            ok: false as const,
            error: 'La solicitud no tiene fecha de nacimiento.',
          }
        }

        const address = [sol.domicilioCalle, sol.domicilioLocalidad]
          .filter(Boolean)
          .join(', ')

        const addressCobro = sol.domicilioCobroDistinto
          ? [sol.domicilioCobroCalle, sol.domicilioCobroLocalidad]
              .filter(Boolean)
              .join(', ') || null
          : null

        const quiereDebito = sol.formaPago === 'debito_automatico'

        if (personId) {
          // Reactivar / actualizar persona existente
          await db
            .update(people)
            .set({
              firstName: sol.firstName,
              lastName: sol.lastName,
              birthDate,
              phone: sol.phone,
              phoneAlt: sol.phoneAlt,
              email: sol.email,
              address: address || null,
              addressCobro,
              status: 'activo',
              tieneDebitoAutomatico: quiereDebito,
              beca: !!sol.solicitaBeca,
              updatedAt: new Date(),
              recordSource: 'tramite_web',
            })
            .where(eq(people.id, personId))

          const [memActiva] = await db
            .select()
            .from(memberships)
            .where(
              and(
                eq(memberships.personId, personId),
                eq(memberships.status, 'activo'),
                isNull(memberships.endDate),
              ),
            )
            .limit(1)

          const category = resolverCategoriaSocialAlta({
            birthDate,
            esDeportista,
          })

          if (!memActiva) {
            const memberNumber =
              sol.memberNumberSugerido?.trim() ||
              (await obtenerYReservarNumeroSocio(db, clubConfig))
            await db.insert(memberships).values({
              personId,
              memberNumber,
              category,
              subcategoriaCuota: 'pleno',
              status: 'activo',
              startDate: hoy,
            })
          } else {
            await db
              .update(memberships)
              .set({
                category,
                updatedAt: new Date(),
              })
              .where(eq(memberships.id, memActiva.id))
          }
        } else {
          // Persona nueva
          const [persona] = await db
            .insert(people)
            .values({
              documentType: sol.documentType || 'DNI',
              documentNumber: sol.documentNumber,
              firstName: sol.firstName,
              lastName: sol.lastName,
              birthDate,
              phone: sol.phone,
              phoneAlt: sol.phoneAlt,
              email: sol.email,
              address: address || null,
              addressCobro,
              status: 'activo',
              tieneDebitoAutomatico: quiereDebito,
              beca: !!sol.solicitaBeca,
              recordSource: 'tramite_web',
            })
            .returning({ id: people.id })

          personId = persona.id

          const memberNumber =
            sol.memberNumberSugerido?.trim() ||
            (await obtenerYReservarNumeroSocio(db, clubConfig))

          const category = resolverCategoriaSocialAlta({
            birthDate,
            esDeportista,
          })

          await db.insert(memberships).values({
            personId,
            memberNumber,
            category,
            subcategoriaCuota: 'pleno',
            status: 'activo',
            startDate: hoy,
          })
        }

        // Inscripción deportiva
        if (esDeportista && sol.disciplinaId && personId) {
          const resultado = await resolverCategoriaDeportiva(
            sol.disciplinaId,
            birthDate,
          )
          if (!resultado.ok) {
            return {
              ok: false as const,
              error:
                resultado.error ||
                'No se pudo asignar categoría deportiva. Revisá reglas en Deportes.',
            }
          }

          // desactivar inscripciones previas activas
          await db
            .update(inscripcionesDeportivas)
            .set({ activa: false, fechaFin: hoy })
            .where(
              and(
                eq(inscripcionesDeportivas.personId, personId),
                eq(inscripcionesDeportivas.activa, true),
              ),
            )

          await db.insert(inscripcionesDeportivas).values({
            personId,
            disciplinaId: sol.disciplinaId,
            categoriaDeportivaId: resultado.categoria.id,
            subcategoriaCuota: 'pleno',
            esHermano: false,
            esTercerHermano: false,
            esSegundoDeporte: false,
            fechaInicio: hoy,
            activa: true,
          })
        }

        await db
          .update(solicitudesTramite)
          .set({
            estado: 'aprobada',
            personId,
            revisadoPor: user.userId,
            revisadoEn: new Date(),
            notasAdmin: normalizarTexto(data.notasAdmin),
            updatedAt: new Date(),
          })
          .where(eq(solicitudesTramite.id, sol.id))

        return {
          ok: true as const,
          mensaje: 'Alta aprobada. Persona y membresía actualizadas.',
          personId,
        }
      }

      return { ok: false as const, error: 'Tipo de trámite no soportado.' }
    } catch (err) {
      console.error(err)
      return {
        ok: false as const,
        error: 'No se pudo aprobar el trámite. Revisá la consola del servidor.',
      }
    }
  })