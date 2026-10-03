import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { requireUser } from './auth.server'
import { resolverCategoriaDeportiva } from './deportes.server'

function formatFechaAR(iso: string) {
  const d = iso.slice(0, 10)
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return iso
  return `${day}/${m}/${y}`
}

function normalizarTexto(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseFechaAR(valor: unknown): string | null {
  if (valor == null || valor === '') return null
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    // serial Excel
    const utc = Math.round((valor - 25569) * 86400 * 1000)
    const d = new Date(utc)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const s = String(valor).trim()
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) {
    const day = m1[1].padStart(2, '0')
    const month = m1[2].padStart(2, '0')
    return `${m1[3]}-${month}-${day}`
  }
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
  return null
}

function siNo(v: unknown): boolean {
  const s = String(v ?? '')
    .trim()
    .toLowerCase()
  return s === 'si' || s === 'sí' || s === '1' || s === 'true' || s === 'x'
}

export type FilaPadron = {
  dni: string
  apellido: string
  nombre: string
  fechaNacimiento: string | null
  nroSocio: string
  deporte: string
  esSocio: boolean
  categoriaSocial: string
  domicilio: string
  celular: string
  telefono: string
  debito: boolean
  email: string
  fila: number
}

function mapearFila(raw: Record<string, unknown>, fila: number): FilaPadron {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(raw).find(
        (rk) => normalizarTexto(rk) === normalizarTexto(k),
      )
      if (found != null && raw[found] != null && raw[found] !== '') {
        return raw[found]
      }
    }
    return ''
  }

  const dni = String(get('DNI', 'dni', 'documento')).replace(/\D/g, '')
  const nroSocio = String(get('Nro Socio', 'NroSocio', 'numero_socio', 'nro socio')).replace(
    /\D/g,
    '',
  )

  return {
    dni,
    apellido: String(get('Apellido', 'apellido')).trim(),
    nombre: String(get('Nombre', 'nombre')).trim(),
    fechaNacimiento: parseFechaAR(get('Fecha_Nacimiento', 'Fecha Nacimiento', 'fecha_nacimiento')),
    nroSocio,
    deporte: String(get('Deporte', 'deporte')).trim(),
    esSocio: siNo(get('es_socio', 'es socio', 'Es socio')) || !!nroSocio,
    categoriaSocial: String(
      get('categoria_social', 'categoria social', 'Categoría social'),
    )
      .trim()
      .toLowerCase(),
    domicilio: String(get('Domicilio', 'domicilio')).trim(),
    celular: String(get('Celular', 'celular')).replace(/\D/g, ''),
    telefono: String(get('Telefono', 'Teléfono', 'telefono')).trim(),
    debito: siNo(get('debito_automatico', 'debito automatico', 'Débito')),
    email: String(get('Mail', 'Email', 'mail', 'email')).trim(),
    fila,
  }
}

export const exportarPadron = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const { db } = await import('../../db')
    const {
      people,
      memberships,
      inscripcionesDeportivas,
      disciplinas,
      categoriasDeportivas,
    } = await import('../../db/schema')

    const rows = await db
      .select({
        dni: people.documentNumber,
        apellido: people.lastName,
        nombre: people.firstName,
        fechaNacimiento: people.birthDate,
        domicilio: people.address,
        domicilioCobro: people.addressCobro,
        celular: people.phoneAlt,
        telefono: people.phone,
        email: people.email,
        debito: people.tieneDebitoAutomatico,
        nroSocio: memberships.memberNumber,
        categoriaSocial: memberships.category,
        deporte: disciplinas.nombre,
        categoriaDeportiva: categoriasDeportivas.nombre,
      })
      .from(people)
      .leftJoin(
        memberships,
        and(
          eq(memberships.personId, people.id),
          eq(memberships.status, 'activo'),
          isNull(memberships.endDate),
        ),
      )
      .leftJoin(
        inscripcionesDeportivas,
        and(
          eq(inscripcionesDeportivas.personId, people.id),
          eq(inscripcionesDeportivas.activa, true),
        ),
      )
      .leftJoin(
        disciplinas,
        eq(inscripcionesDeportivas.disciplinaId, disciplinas.id),
      )
      .leftJoin(
        categoriasDeportivas,
        eq(
          inscripcionesDeportivas.categoriaDeportivaId,
          categoriasDeportivas.id,
        ),
      )
      .orderBy(asc(people.lastName), asc(people.firstName))

    const data = rows.map((r) => ({
      DNI: r.dni,
      Apellido: r.apellido,
      Nombre: r.nombre,
      Fecha_Nacimiento: r.fechaNacimiento
        ? formatFechaAR(String(r.fechaNacimiento))
        : '',
      'Nro Socio': r.nroSocio ?? '',
      Deporte: r.deporte ?? '',
      es_socio: r.nroSocio ? 'SI' : 'NO',
      categoria_social: r.categoriaSocial ?? '',
      Domicilio: r.domicilio ?? '',
      Celular: r.celular ?? '',
      Telefono: r.telefono ?? '',
      debito_automatico: r.debito ? 'SI' : 'NO',
      Mail: r.email ?? '',
    }))

    return { ok: true as const, rows: data }
  },
)

export const importarPadron = createServerFn({ method: 'POST' })
  .inputValidator((data: { filas: Record<string, unknown>[] }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const {
      people,
      memberships,
      inscripcionesDeportivas,
      disciplinas,
      clubConfig,
    } = await import('../../db/schema')

    const discs = await db.select().from(disciplinas).where(eq(disciplinas.activa, true))

    function calcularCategoriaPorEdad(
      birthDate?: string | null,
    ): 'menor' | 'cadete' | 'activo' {
      if (!birthDate) return 'activo'
      const hoy = new Date()
      const nac = new Date(birthDate)
      let edad = hoy.getFullYear() - nac.getFullYear()
      const m = hoy.getMonth() - nac.getMonth()
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
      if (edad < 12) return 'menor'
      if (edad < 18) return 'cadete'
      return 'activo'
    }

    let creados = 0
    let actualizados = 0
    const errores: { fila: number; mensaje: string }[] = []
    let maxSocio = 0

    const startDate = new Date().toISOString().slice(0, 10)

    for (let i = 0; i < data.filas.length; i++) {
      const f = mapearFila(data.filas[i], i + 2)

      if (!f.dni || f.dni.length < 7) {
        errores.push({ fila: f.fila, mensaje: 'DNI inválido' })
        continue
      }
      if (!f.apellido || !f.nombre) {
        errores.push({ fila: f.fila, mensaje: 'Falta apellido o nombre' })
        continue
      }
      if (!f.fechaNacimiento) {
        errores.push({ fila: f.fila, mensaje: 'Fecha de nacimiento inválida' })
        continue
      }
      if (!f.domicilio) {
        errores.push({ fila: f.fila, mensaje: 'Falta domicilio' })
        continue
      }
      if (!f.celular || f.celular.length < 10) {
        errores.push({ fila: f.fila, mensaje: 'Celular inválido (mín. 10 dígitos)' })
        continue
      }
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
        errores.push({ fila: f.fila, mensaje: 'Email inválido' })
        continue
      }
      if (f.esSocio && !f.nroSocio) {
        errores.push({ fila: f.fila, mensaje: 'Falta Nro Socio' })
        continue
      }

      let disciplinaId: number | null = null
      if (f.deporte) {
        const disc = discs.find(
          (d) => normalizarTexto(d.nombre) === normalizarTexto(f.deporte),
        )
        if (!disc) {
          errores.push({
            fila: f.fila,
            mensaje: `Deporte no encontrado: ${f.deporte}`,
          })
          continue
        }
        disciplinaId = disc.id
      }

      try {
        const [byDni] = await db
          .select()
          .from(people)
          .where(eq(people.documentNumber, f.dni))
          .limit(1)

        let personId = byDni?.id

        if (!personId && f.nroSocio) {
          const [byMem] = await db
            .select({ personId: memberships.personId })
            .from(memberships)
            .where(eq(memberships.memberNumber, f.nroSocio))
            .limit(1)
          if (byMem) personId = byMem.personId
        }

        const personValues = {
          documentType: 'DNI' as const,
          documentNumber: f.dni,
          firstName: f.nombre,
          lastName: f.apellido,
          birthDate: f.fechaNacimiento,
          address: f.domicilio,
          phone: f.telefono || null,
          phoneAlt: f.celular,
          email: f.email || null,
          tieneDebitoAutomatico: f.debito,
          status: 'activo' as const,
          recordSource: 'import_padron',
          updatedAt: new Date(),
        }

        if (personId) {
          await db.update(people).set(personValues).where(eq(people.id, personId))
          actualizados++
        } else {
          const [created] = await db
            .insert(people)
            .values({ ...personValues, createdAt: new Date() })
            .returning({ id: people.id })
          personId = created.id
          creados++
        }

        if (f.esSocio && f.nroSocio) {
          const nSocio = Number(f.nroSocio)
          if (Number.isFinite(nSocio) && nSocio > maxSocio) maxSocio = nSocio

          const category =
            disciplinaId != null
              ? calcularCategoriaPorEdad(f.fechaNacimiento)
              : (['menor', 'cadete', 'activo', 'vitalicio'].includes(
                    f.categoriaSocial,
                  )
                  ? (f.categoriaSocial as
                      | 'menor'
                      | 'cadete'
                      | 'activo'
                      | 'vitalicio')
                  : calcularCategoriaPorEdad(f.fechaNacimiento))

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
                memberNumber: f.nroSocio,
                category,
                updatedAt: new Date(),
              })
              .where(eq(memberships.id, mem.id))
          } else {
            await db.insert(memberships).values({
              personId,
              memberNumber: f.nroSocio,
              category,
              status: 'activo',
              startDate,
            })
          }

          // deporte
          const [insc] = await db
            .select()
            .from(inscripcionesDeportivas)
            .where(
              and(
                eq(inscripcionesDeportivas.personId, personId),
                eq(inscripcionesDeportivas.activa, true),
              ),
            )
            .limit(1)

          if (disciplinaId != null) {
            const resCat = await resolverCategoriaDeportiva(
              disciplinaId,
              f.fechaNacimiento,
            )
            if (!resCat.ok) {
              errores.push({ fila: f.fila, mensaje: resCat.error })
            } else if (insc) {
              await db
                .update(inscripcionesDeportivas)
                .set({
                  disciplinaId,
                  categoriaDeportivaId: resCat.categoria.id,
                })
                .where(eq(inscripcionesDeportivas.id, insc.id))
            } else {
              await db.insert(inscripcionesDeportivas).values({
                personId,
                disciplinaId,
                categoriaDeportivaId: resCat.categoria.id,
                esHermano: false,
                esTercerHermano: false,
                esSegundoDeporte: false,
                fechaInicio: startDate,
                activa: true,
              })
            }
          } else if (insc) {
            await db
              .update(inscripcionesDeportivas)
              .set({ activa: false, fechaFin: startDate })
              .where(eq(inscripcionesDeportivas.id, insc.id))
          }
        }
      } catch (err) {
        console.error(err)
        errores.push({ fila: f.fila, mensaje: 'Error al guardar la fila' })
      }
    }

    if (maxSocio > 0) {
      const rowsCfg = await db
        .select()
        .from(clubConfig)
        .where(eq(clubConfig.key, 'ultimo_numero_socio'))
        .limit(1)
      const actual = rowsCfg[0] ? Number(rowsCfg[0].value) || 0 : 0
      if (maxSocio > actual) {
        if (rowsCfg[0]) {
          await db
            .update(clubConfig)
            .set({ value: String(maxSocio), updatedAt: new Date() })
            .where(eq(clubConfig.key, 'ultimo_numero_socio'))
        } else {
          await db.insert(clubConfig).values({
            key: 'ultimo_numero_socio',
            value: String(maxSocio),
          })
        }
      }
    }

    return {
      ok: true as const,
      creados,
      actualizados,
      errores,
      total: data.filas.length,
    }
  })