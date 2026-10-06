import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { requireUser } from './auth.server'

const TIPOS = [
  'efectivo',
  'transferencia',
  'mercado_pago',
  'debito_automatico',
] as const

export const listarMediosPagoAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireUser()
    const { db } = await import('../../db')
    const { mediosPago } = await import('../../db/schema')

    const medios = await db
      .select()
      .from(mediosPago)
      .orderBy(asc(mediosPago.orden), asc(mediosPago.nombre))

    return { ok: true as const, medios, tipos: TIPOS }
  },
)

export const seedMediosPagoClub = createServerFn({ method: 'POST' }).handler(
  async () => {
    await requireUser()
    const { db } = await import('../../db')
    const { mediosPago } = await import('../../db/schema')

    const existentes = await db.select().from(mediosPago)
    if (existentes.length > 0) {
      return {
        ok: false as const,
        error:
          'Ya hay medios cargados. Agregá o editá desde la lista (no se pisa el seed).',
      }
    }

    const seed = [
      { nombre: 'Efectivo', tipo: 'efectivo', orden: 1 },
      { nombre: 'Débito automático', tipo: 'debito_automatico', orden: 2 },
      {
        nombre: 'Transferencia — Cuenta General',
        tipo: 'transferencia',
        orden: 10,
      },
      {
        nombre: 'Transferencia — Fútbol Formativo',
        tipo: 'transferencia',
        orden: 11,
      },
      {
        nombre: 'Transferencia — Fútbol Mayores',
        tipo: 'transferencia',
        orden: 12,
      },
      {
        nombre: 'Transferencia — Básquet (bancaria)',
        tipo: 'transferencia',
        orden: 13,
      },
      {
        nombre: 'Mercado Pago — Cuotas Básquet',
        tipo: 'mercado_pago',
        orden: 20,
      },
      {
        nombre: 'Mercado Pago — Piso deportivo',
        tipo: 'mercado_pago',
        orden: 21,
      },
    ]

    for (const m of seed) {
      await db.insert(mediosPago).values({
        nombre: m.nombre,
        tipo: m.tipo,
        orden: m.orden,
        activa: true,
      })
    }

    return { ok: true as const, cantidad: seed.length }
  },
)

export const crearMedioPago = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      nombre: string
      tipo: string
      alias?: string
      cbu?: string
      datosPago?: string
      orden?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { mediosPago } = await import('../../db/schema')

    const nombre = data.nombre.trim()
    const tipo = data.tipo.trim()
    if (!nombre) return { ok: false as const, error: 'Nombre obligatorio' }
    if (!(TIPOS as readonly string[]).includes(tipo)) {
      return { ok: false as const, error: 'Tipo inválido' }
    }

    const [row] = await db
      .insert(mediosPago)
      .values({
        nombre,
        tipo,
        alias: data.alias?.trim() || null,
        cbu: data.cbu?.trim() || null,
        datosPago: data.datosPago?.trim() || null,
        orden: data.orden ?? 50,
        activa: true,
      })
      .returning({ id: mediosPago.id })

    return { ok: true as const, id: row.id }
  })

export const actualizarMedioPago = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      nombre: string
      tipo: string
      alias?: string
      cbu?: string
      datosPago?: string
      orden?: number
      activa: boolean
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const { mediosPago } = await import('../../db/schema')

    const nombre = data.nombre.trim()
    const tipo = data.tipo.trim()
    if (!nombre) return { ok: false as const, error: 'Nombre obligatorio' }
    if (!(TIPOS as readonly string[]).includes(tipo)) {
      return { ok: false as const, error: 'Tipo inválido' }
    }

    await db
      .update(mediosPago)
      .set({
        nombre,
        tipo,
        alias: data.alias?.trim() || null,
        cbu: data.cbu?.trim() || null,
        datosPago: data.datosPago?.trim() || null,
        orden: data.orden ?? 50,
        activa: data.activa,
      })
      .where(eq(mediosPago.id, data.id))

    return { ok: true as const }
  })