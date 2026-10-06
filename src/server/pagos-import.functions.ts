import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { requireUser } from './auth.server'

type FilaRaw = Record<string, unknown>

function normKey(k: string) {
  return k
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function getField(row: FilaRaw, candidates: string[]): string {
  const map = new Map<string, unknown>()
  for (const [k, v] of Object.entries(row)) {
    map.set(normKey(k), v)
  }
  for (const c of candidates) {
    const v = map.get(normKey(c))
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function parseFecha(raw: string): string | null {
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (m) {
    const d = m[1].padStart(2, '0')
    const mo = m[2].padStart(2, '0')
    return `${m[3]}-${mo}-${d}`
  }
  return null
}

function parsePeriodo(raw: string): string | null {
  const s = raw.trim()
  if (/^\d{4}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/\-.](\d{4})$/)
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`
  return null
}

function parseImporte(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, '')
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function parseOrden(raw: string): number | null {
  if (!raw.trim()) return null
  const n = Number(raw.trim())
  return Number.isInteger(n) ? n : null
}

function clasificarForma(raw: string): 'efectivo' | 'transferencia' | 'mercado_pago' | 'debito_automatico' | null {
  const s = normKey(raw)
  if (!s) return null
  if (s === 'ef' || s.includes('efectivo')) return 'efectivo'
  if (s.includes('debito') || s === 'da') return 'debito_automatico'
  if (s.includes('mercado') || s === 'mp' || s === 'mercadopago') {
    return 'mercado_pago'
  }
  if (s.includes('transf') || s === 'tr') return 'transferencia'
  return null
}

type FilaOk = {
  fila: number
  dni: string
  personId: number
  nombre: string
  fechaPago: string
  periodo: string
  importe: number
  cuotaId: number
  medioPagoId: number
  medioNombre: string
  referencia: string | null
}

type FilaError = { fila: number; mensaje: string }

export const previewImportPagos = createServerFn({ method: 'POST' })
  .inputValidator((data: { filas: FilaRaw[] }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { db } = await import('../../db')
    const {
      people,
      cuotasGeneradas,
      mediosPago,
      pagos,
      pagoCuotas,
    } = await import('../../db/schema')

    const medios = await db.select().from(mediosPago).where(eq(mediosPago.activa, true))

    const ok: FilaOk[] = []
    const errores: FilaError[] = []
    const omitidos: FilaError[] = []

    for (let i = 0; i < data.filas.length; i++) {
      const fila = i + 2
      const row = data.filas[i]

      const dniRaw = getField(row, ['DNI', 'Documento', 'document_number'])
      const dni = dniRaw.replace(/\D/g, '')
      const fechaRaw = getField(row, ['FECHA PAGO', 'Fecha_Pago', 'Fecha', 'fecha_pago'])
      const periodoRaw = getField(row, ['PERIODO', 'Periodo', 'periodo'])
      const importeRaw = getField(row, ['IMPORTE', 'Importe', 'Monto', 'monto'])
      const formaRaw = getField(row, [
        'FORMA DE PAGO',
        'Forma_Pago',
        'Medio',
        'FORMA',
      ])
      const ordenRaw = getField(row, ['ORDEN', 'Orden', 'CODIGO_MEDIO', 'orden'])
      const refRaw =
        getField(row, ['Referencia', 'REF', 'referencia']) || null

      if (!dni) {
        errores.push({ fila, mensaje: 'DNI vacío' })
        continue
      }

      const fechaPago = parseFecha(fechaRaw)
      if (!fechaPago) {
        errores.push({ fila, mensaje: `Fecha inválida: ${fechaRaw || '(vacía)'}` })
        continue
      }

      const periodo = parsePeriodo(periodoRaw)
      if (!periodo) {
        errores.push({
          fila,
          mensaje: `Período inválido: ${periodoRaw || '(vacío)'}`,
        })
        continue
      }

      const importe = parseImporte(importeRaw)
      if (importe == null || importe <= 0) {
        errores.push({
          fila,
          mensaje: `Importe inválido: ${importeRaw || '(vacío)'}`,
        })
        continue
      }

      const [persona] = await db
        .select({
          id: people.id,
          firstName: people.firstName,
          lastName: people.lastName,
          documentNumber: people.documentNumber,
        })
        .from(people)
        .where(eq(people.documentNumber, dni))
        .limit(1)

      if (!persona) {
        errores.push({ fila, mensaje: `DNI ${dni} no encontrado en personas` })
        continue
      }

      const cuotas = await db
        .select()
        .from(cuotasGeneradas)
        .where(
          and(
            eq(cuotasGeneradas.personId, persona.id),
            eq(cuotasGeneradas.periodo, periodo),
            eq(cuotasGeneradas.estado, 'pendiente'),
          ),
        )

      if (cuotas.length === 0) {
        // ¿ya pagada?
        const pagadas = await db
          .select({ id: cuotasGeneradas.id })
          .from(cuotasGeneradas)
          .where(
            and(
              eq(cuotasGeneradas.personId, persona.id),
              eq(cuotasGeneradas.periodo, periodo),
              eq(cuotasGeneradas.estado, 'pagada'),
            ),
          )
        if (pagadas.length > 0) {
          omitidos.push({
            fila,
            mensaje: `DNI ${dni} período ${periodo}: cuota ya pagada`,
          })
        } else {
          errores.push({
            fila,
            mensaje: `DNI ${dni}: sin cuota pendiente en ${periodo}`,
          })
        }
        continue
      }

      if (cuotas.length > 1) {
        errores.push({
          fila,
          mensaje: `DNI ${dni} período ${periodo}: hay ${cuotas.length} cuotas pendientes (revisar manual)`,
        })
        continue
      }

      const cuota = cuotas[0]
      const montoCuota = Number(cuota.montoFinal)
      if (Math.abs(montoCuota - importe) > 0.01) {
        errores.push({
          fila,
          mensaje: `DNI ${dni} ${periodo}: importe ${importe} ≠ cuota ${montoCuota}`,
        })
        continue
      }

      const orden = parseOrden(ordenRaw)
      let medio = orden != null
        ? medios.find((m) => m.orden === orden)
        : undefined

      if (!medio) {
        const tipo = clasificarForma(formaRaw)
        if (!tipo) {
          errores.push({
            fila,
            mensaje: `Forma de pago no reconocida: ${formaRaw || '(vacía)'}. Usá EF/TRANSF/MERCADOPAGO u ORDEN.`,
          })
          continue
        }
        const candidatos = medios.filter((m) => m.tipo === tipo)
        if (candidatos.length === 0) {
          errores.push({ fila, mensaje: `No hay medio activo tipo ${tipo}` })
          continue
        }
        if (candidatos.length > 1 && orden == null) {
          errores.push({
            fila,
            mensaje: `Hay varios medios tipo ${tipo}. Indicá columna ORDEN (${candidatos.map((c) => c.orden).join(', ')})`,
          })
          continue
        }
        medio = candidatos[0]
      }

      if (!medio) {
        errores.push({
          fila,
          mensaje: `No se resolvió medio (ORDEN=${ordenRaw || '—'} FORMA=${formaRaw || '—'})`,
        })
        continue
      }

      // ¿esta cuota ya tiene pago_cuotas?
      const ya = await db
        .select({ id: pagoCuotas.id })
        .from(pagoCuotas)
        .where(eq(pagoCuotas.cuotaId, cuota.id))
        .limit(1)
      if (ya.length > 0) {
        omitidos.push({
          fila,
          mensaje: `Cuota #${cuota.id} ya tiene pago imputado`,
        })
        continue
      }

      ok.push({
        fila,
        dni,
        personId: persona.id,
        nombre: `${persona.lastName}, ${persona.firstName}`,
        fechaPago,
        periodo,
        importe,
        cuotaId: cuota.id,
        medioPagoId: medio.id,
        medioNombre: medio.nombre,
        referencia: refRaw,
      })
    }

    return {
      ok: true as const,
      aImportar: ok,
      errores,
      omitidos,
      totalFilas: data.filas.length,
    }
  })

export const confirmarImportPagos = createServerFn({ method: 'POST' })
  .inputValidator((data: { items: FilaOk[] }) => data)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const { db } = await import('../../db')
    const { pagos, pagoCuotas, cuotasGeneradas } = await import(
      '../../db/schema'
    )

    let creados = 0
    const errores: FilaError[] = []

    for (const item of data.items) {
      try {
        const [cuota] = await db
          .select()
          .from(cuotasGeneradas)
          .where(
            and(
              eq(cuotasGeneradas.id, item.cuotaId),
              eq(cuotasGeneradas.estado, 'pendiente'),
            ),
          )
          .limit(1)

        if (!cuota) {
          errores.push({
            fila: item.fila,
            mensaje: `Cuota #${item.cuotaId} ya no está pendiente`,
          })
          continue
        }

        const [pago] = await db
          .insert(pagos)
          .values({
            personId: item.personId,
            fechaPago: item.fechaPago,
            montoTotal: item.importe.toFixed(2),
            medioPagoId: item.medioPagoId,
            referencia: item.referencia,
            periodo: item.periodo,
            observacion: `Import Excel fila ${item.fila}`,
            cargadoPor: user.userId,
          })
          .returning({ id: pagos.id })

        if (!pago?.id) {
          errores.push({ fila: item.fila, mensaje: 'No se creó el pago' })
          continue
        }

        await db.insert(pagoCuotas).values({
          pagoId: pago.id,
          cuotaId: item.cuotaId,
          montoAplicado: item.importe.toFixed(2),
        })

        await db
          .update(cuotasGeneradas)
          .set({ estado: 'pagada' })
          .where(
            and(
              eq(cuotasGeneradas.id, item.cuotaId),
              eq(cuotasGeneradas.estado, 'pendiente'),
            ),
          )

        creados++
      } catch (err: any) {
        console.error(err)
        errores.push({
          fila: item.fila,
          mensaje: err?.message || 'Error al insertar',
        })
      }
    }

    return {
      ok: true as const,
      creados,
      errores,
    }
  })