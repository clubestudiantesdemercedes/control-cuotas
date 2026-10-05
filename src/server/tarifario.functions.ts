import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, isNull, lte, or, sql } from 'drizzle-orm'
import { requireUser } from './auth.server'
import { CLAVES_TARIFA } from '../lib/tarifario-claves'

function primerDiaMes(periodoYYYYMM: string) {
  const m = periodoYYYYMM.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  return `${m[1]}-${m[2]}-01`
}

function diaAnterior(isoDate: string) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export const listarTarifario = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const { db } = await import('../../db')
    const { tarifario } = await import('../../db/schema')

    const rows = await db
      .select()
      .from(tarifario)
      .orderBy(
        desc(tarifario.vigenciaDesde),
        asc(tarifario.tipoCuota),
        asc(tarifario.tipoSocioSocial),
      )

    const hoy = new Date().toISOString().slice(0, 10)
    const vigentes = rows.filter((r) => {
      if (r.vigenciaDesde > hoy) return false
      if (r.vigenciaHasta && r.vigenciaHasta < hoy) return false
      return true
    })

    return {
      ok: true as const,
      todas: rows,
      vigentes,
      claves: CLAVES_TARIFA,
    }
  },
)

export const seedTarifarioInicial = createServerFn({ method: 'POST' })
  .inputValidator((data: { vigenciaDesde: string }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { tarifario } = await import('../../db/schema')

    const desde = primerDiaMes(data.vigenciaDesde) || data.vigenciaDesde
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      return {
        ok: false as const,
        error: 'Fecha inválida (usá YYYY-MM o YYYY-MM-DD)',
      }
    }

    const existentes = await db.select().from(tarifario).limit(1)
    if (existentes.length > 0) {
      return {
        ok: false as const,
        error:
          'Ya hay tarifas cargadas. Usá "Nueva vigencia" para cambiar montos.',
      }
    }

    for (const c of CLAVES_TARIFA) {
      await db.insert(tarifario).values({
        tipoCuota: c.tipoCuota,
        tipoSocioSocial: c.clave,
        monto: c.montoDefault,
        vigenciaDesde: desde,
        vigenciaHasta: null,
        descripcion: c.label,
        esHermano: c.clave === '2_hermano',
        esTercerHermano: c.clave === '3_hermano',
        esSegundoDeporte: false,
      })
    }

    return {
      ok: true as const,
      cantidad: CLAVES_TARIFA.length,
      vigenciaDesde: desde,
    }
  })

export const crearNuevaVigencia = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      vigenciaDesde: string
      montos: { clave: string; tipoCuota: string; monto: string }[]
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { tarifario } = await import('../../db/schema')

    const desde = primerDiaMes(data.vigenciaDesde)
    if (!desde) {
      return { ok: false as const, error: 'Período inválido (formato YYYY-MM)' }
    }

    const cierreAnteriores = diaAnterior(desde)

    await db
      .update(tarifario)
      .set({ vigenciaHasta: cierreAnteriores })
      .where(isNull(tarifario.vigenciaHasta))

    for (const m of data.montos) {
      const meta = CLAVES_TARIFA.find(
        (c) => c.clave === m.clave && c.tipoCuota === m.tipoCuota,
      )
      const monto = String(m.monto).replace(',', '.').trim()
      if (!monto || Number.isNaN(Number(monto))) {
        return { ok: false as const, error: `Monto inválido en ${m.clave}` }
      }

      await db.insert(tarifario).values({
        tipoCuota: m.tipoCuota,
        tipoSocioSocial: m.clave,
        monto,
        vigenciaDesde: desde,
        vigenciaHasta: null,
        descripcion: meta?.label ?? m.clave,
        esHermano: m.clave === '2_hermano',
        esTercerHermano: m.clave === '3_hermano',
        esSegundoDeporte: false,
      })
    }

    return { ok: true as const, vigenciaDesde: desde }
  })