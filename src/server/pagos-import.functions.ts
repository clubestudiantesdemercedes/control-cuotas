import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import { db } from '../../db'
import { people, pagosImportados, importBatches } from '../../db/schema'
import { requireUser } from './auth.server'

export type FilaPagoPreview = {
  filaOrigen: number
  dni: string | null
  fechaPago: string
  periodo: string
  nombreSocio: string | null
  pagador: string | null
  categoria: string | null
  importe: number
  formaPago: string | null
  fingerprint: string
  estado: 'nuevo' | 'existente' | 'sin_dni' | 'error'
  error?: string
}

function excelDateToIso(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value)
    if (!d) return null
    const mm = String(d.m).padStart(2, '0')
    const dd = String(d.d).padStart(2, '0')
    return `${d.y}-${mm}-${dd}`
  }
  const s = String(value).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m2) {
    return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
  }
  return null
}

function periodoFromValue(value: unknown): string | null {
  const iso = excelDateToIso(value)
  if (iso) return iso.slice(0, 7)
  const s = String(value ?? '').trim().toLowerCase()
  if (/^\d{4}-\d{2}$/.test(s)) return s

  // Google Sheets puede entregar períodos como "feb-2026".
  const match = s.match(/^([a-záéíóúñ]+)[\s/-]+(\d{4})$/i)
  if (match) {
    const monthNames: Record<string, string> = {
      ene: '01', enero: '01',
      feb: '02', febrero: '02',
      mar: '03', marzo: '03',
      abr: '04', abril: '04',
      may: '05', mayo: '05',
      jun: '06', junio: '06',
      jul: '07', julio: '07',
      ago: '08', agosto: '08',
      sep: '09', sept: '09', septiembre: '09',
      oct: '10', octubre: '10',
      nov: '11', noviembre: '11',
      dic: '12', diciembre: '12',
    }
    const month = monthNames[match[1]]
    if (month) return `${match[2]}-${month}`
  }
  return null
}

function parseImporte(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && !isNaN(value)) return value
  const s = String(value)
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim()
  const n = Number(s)
  return isNaN(n) ? null : n
}

function normalizarDni(value: unknown): string | null {
  if (value == null || value === '') return null
  const d = String(value).replace(/\D/g, '')
  return d.length >= 7 ? d : null
}

function fingerprintOf(row: {
  dni: string | null
  fechaPago: string
  periodo: string
  importe: number
  categoria: string | null
  formaPago: string | null
  nombreSocio: string | null
}): string {
  return [
    row.dni || '',
    row.fechaPago,
    row.periodo,
    String(row.importe),
    (row.categoria || '').toLowerCase().trim(),
    (row.formaPago || '').toLowerCase().trim(),
    (row.nombreSocio || '').toLowerCase().trim(),
  ].join('|')
}

function meaningfulCell(value: unknown): unknown {
  if (value == null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '-' || trimmed === '–' || trimmed === '—') {
      return null
    }
    return trimmed
  }
  return value
}

function parseDetalleRows(raw: any[][]): FilaPagoPreview[] {
  let headerRow = 0
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const row = raw[i].map((c) => String(c).toLowerCase())
    if (row.includes('dni') && row.some((c) => c.includes('fecha'))) {
      headerRow = i
      break
    }
  }

  const headers = (raw[headerRow] || []).map((h) => String(h).trim().toLowerCase())
  const idx = {
    dni: headers.findIndex((h) => h === 'dni'),
    fecha: headers.findIndex((h) => h.includes('fecha')),
    periodo: headers.findIndex((h) => h.includes('periodo') || h.includes('período')),
    socio: headers.findIndex((h) => h === 'socio'),
    pagador: headers.findIndex((h) => h.includes('pagador')),
    categoria: headers.findIndex((h) => h.includes('categoria') || h.includes('categoría')),
    importe: headers.findIndex((h) => h.includes('importe')),
    forma: headers.findIndex((h) => h.includes('forma')),
  }

  const filas: FilaPagoPreview[] = []

  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r]
    if (!row || row.every((c) => c === '' || c == null)) continue

    const fechaPago = excelDateToIso(meaningfulCell(idx.fecha >= 0 ? row[idx.fecha] : null))
    const periodo = periodoFromValue(meaningfulCell(idx.periodo >= 0 ? row[idx.periodo] : null))
    const importe = parseImporte(meaningfulCell(idx.importe >= 0 ? row[idx.importe] : null))
    const dni = normalizarDni(meaningfulCell(idx.dni >= 0 ? row[idx.dni] : null))
    const nombreSocio =
      idx.socio >= 0 && meaningfulCell(row[idx.socio]) != null
        ? String(meaningfulCell(row[idx.socio])).trim()
        : null
    const pagador =
      idx.pagador >= 0 && meaningfulCell(row[idx.pagador]) != null
        ? String(meaningfulCell(row[idx.pagador])).trim()
        : null
    const categoria =
      idx.categoria >= 0 && meaningfulCell(row[idx.categoria]) != null
        ? String(meaningfulCell(row[idx.categoria])).trim()
        : null
    const formaPago =
      idx.forma >= 0 && meaningfulCell(row[idx.forma]) != null
        ? String(meaningfulCell(row[idx.forma])).trim()
        : null

    if (!fechaPago && !periodo && importe == null && !nombreSocio) continue

    if (!fechaPago || !periodo || importe == null) {
      const faltantes = [
        !fechaPago ? 'fecha de pago' : null,
        !periodo ? 'período' : null,
        importe == null ? 'importe' : null,
      ].filter(Boolean)
      filas.push({
        filaOrigen: r + 1,
        dni,
        fechaPago: fechaPago || '',
        periodo: periodo || '',
        nombreSocio,
        pagador,
        categoria,
        importe: importe ?? 0,
        formaPago,
        fingerprint: `error-${r}`,
        estado: 'error',
        error: `Falta ${faltantes.join(', ')}`,
      })
      continue
    }

    const fp = fingerprintOf({
      dni,
      fechaPago,
      periodo,
      importe,
      categoria,
      formaPago,
      nombreSocio,
    })

    filas.push({
      filaOrigen: r + 1,
      dni,
      fechaPago,
      periodo,
      nombreSocio,
      pagador,
      categoria,
      importe,
      formaPago,
      fingerprint: fp,
      estado: 'nuevo',
    })
  }

  return filas
}

function parseDetalleBuffer(buffer: ArrayBuffer): FilaPagoPreview[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase() === 'detalle') || wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
  })
  return parseDetalleRows(raw)
}

function getGoogleSheetsEnv() {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }
  const env = runtime.process?.env
  const url = env?.GOOGLE_SHEETS_URL
  const token = env?.GOOGLE_SHEETS_API_TOKEN

  if (!url || !token) {
    throw new Error(
      'Falta configurar GOOGLE_SHEETS_URL y GOOGLE_SHEETS_API_TOKEN en las variables de entorno del servidor',
    )
  }

  return { url, token }
}

async function fetchGoogleSheetsRows(): Promise<any[][]> {
  const { url, token } = getGoogleSheetsEnv()
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Google Sheets respondió con HTTP ${response.status}`)
  }

  const result = (await response.json()) as {
    ok?: boolean
    error?: string
    rows?: any[][]
  }

  if (!result.ok || !Array.isArray(result.rows)) {
    throw new Error(result.error || 'La respuesta de Google Sheets no contiene filas')
  }

  return result.rows
}
export const previewImportPagos = createServerFn({ method: 'POST' })
  .inputValidator((data: { fileBase64: string; fileName?: string }) => data)
  .handler(async ({ data }) => {
    await requireUser()

    try {
      const binary = Buffer.from(data.fileBase64, 'base64')
      const filas = parseDetalleBuffer(
        binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
      )

      const fingerprints = filas
        .filter((f) => f.estado !== 'error' && Boolean(f.dni))
        .map((f) => f.fingerprint)

      const existentes = new Set<string>()
      if (fingerprints.length > 0) {
        for (let i = 0; i < fingerprints.length; i += 500) {
          const chunk = fingerprints.slice(i, i + 500)
          const found = await db
            .select({ fingerprint: pagosImportados.fingerprint })
            .from(pagosImportados)
            .where(inArray(pagosImportados.fingerprint, chunk))
          found.forEach((f) => existentes.add(f.fingerprint))
        }
      }

      let nuevos = 0
      let existing = 0
      let errores = 0
      let sinDni = 0

      const resultado = filas.map((f) => {
        if (f.estado === 'error') {
          errores++
          return f
        }
        if (!f.dni) {
          sinDni++
          return { ...f, estado: 'sin_dni' as const }
        }
        if (existentes.has(f.fingerprint)) {
          existing++
          return { ...f, estado: 'existente' as const }
        }
        nuevos++
        return { ...f, estado: 'nuevo' as const }
      })

      return {
        ok: true as const,
        fileName: data.fileName || 'detalle.xlsx',
        total: resultado.length,
        nuevos,
        existentes: existing,
        errores,
        sinDni,
        muestraNuevos: resultado.filter((f) => f.estado === 'nuevo').slice(0, 50),
        muestraErrores: resultado.filter((f) => f.estado === 'error').slice(0, 50),
        muestraSinDni: resultado.filter((f) => f.estado === 'sin_dni').slice(0, 50),
        todasNuevas: resultado.filter((f) => f.estado === 'nuevo'),
      }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'No se pudo leer el archivo Excel' }
    }
  })

export const previewImportGoogleSheets = createServerFn({ method: 'POST' })
  .inputValidator((data: Record<string, never>) => data)
  .handler(async () => {
    await requireUser()

    try {
      const raw = await fetchGoogleSheetsRows()
      const filas = parseDetalleRows(raw)
      const fingerprints = filas
        .filter((f) => f.estado !== 'error' && Boolean(f.dni))
        .map((f) => f.fingerprint)

      const existentes = new Set<string>()
      for (let i = 0; i < fingerprints.length; i += 500) {
        const chunk = fingerprints.slice(i, i + 500)
        const found = await db
          .select({ fingerprint: pagosImportados.fingerprint })
          .from(pagosImportados)
          .where(inArray(pagosImportados.fingerprint, chunk))
        found.forEach((f) => existentes.add(f.fingerprint))
      }

      let nuevos = 0
      let existing = 0
      let errores = 0
      let sinDni = 0

      const resultado = filas.map((f) => {
        if (f.estado === 'error') {
          errores++
          return f
        }
        if (!f.dni) {
          sinDni++
          return { ...f, estado: 'sin_dni' as const }
        }
        if (existentes.has(f.fingerprint)) {
          existing++
          return { ...f, estado: 'existente' as const }
        }
        nuevos++
        return { ...f, estado: 'nuevo' as const }
      })

      return {
        ok: true as const,
        fileName: 'Google Sheets · Detalle',
        total: resultado.length,
        nuevos,
        existentes: existing,
        errores,
        sinDni,
        muestraNuevos: resultado.filter((f) => f.estado === 'nuevo').slice(0, 50),
        muestraErrores: resultado.filter((f) => f.estado === 'error').slice(0, 50),
        muestraSinDni: resultado.filter((f) => f.estado === 'sin_dni').slice(0, 50),
        todasNuevas: resultado.filter((f) => f.estado === 'nuevo'),
      }
    } catch (err) {
      console.error('Error al consultar Google Sheets:', err)
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : 'No se pudo consultar Google Sheets',
      }
    }
  })

export const confirmarImportPagos = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      fileName?: string
      source?: 'xlsx' | 'google_sheets'
      filas: Array<{
        dni: string | null
        fechaPago: string
        periodo: string
        nombreSocio: string | null
        pagador: string | null
        categoria: string | null
        importe: number
        formaPago: string | null
        fingerprint: string
      }>
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireUser()

    try {
      // Para Google Sheets, volver a leer la fuente en el servidor al confirmar.
      // Así no confiamos en filas ni fingerprints enviados por el navegador.
      const filasValidas =
        data.source === 'google_sheets'
          ? parseDetalleRows(await fetchGoogleSheetsRows()).filter((f) => f.estado !== 'error')
          : data.filas.filter((f) => Boolean(f.dni))

      // Los pagos sin DNI quedan visibles como pendientes de alta, pero nunca se insertan.
      const sinDni = filasValidas.filter((f) => !f.dni).length
      const filasConDni = filasValidas.filter((f) => Boolean(f.dni))

      if (!filasConDni.length) {
        return {
          ok: false as const,
          error: sinDni
            ? 'No hay pagos con DNI para importar. Los registros sin DNI quedan pendientes de alta.'
            : 'No hay filas válidas para importar',
        }
      }

      const vistos = new Set<string>()
      const unicas = filasConDni.filter((f) => {
        if (!f.fingerprint || vistos.has(f.fingerprint)) return false
        vistos.add(f.fingerprint)
        return true
      })

      const fps = unicas.map((f) => f.fingerprint)
      const existentes = new Set<string>()
      for (let i = 0; i < fps.length; i += 500) {
        const chunk = fps.slice(i, i + 500)
        const found = await db
          .select({ fingerprint: pagosImportados.fingerprint })
          .from(pagosImportados)
          .where(inArray(pagosImportados.fingerprint, chunk))
        found.forEach((f) => existentes.add(f.fingerprint))
      }

      const aInsertar = unicas.filter((f) => !existentes.has(f.fingerprint))

      const dnis = [
        ...new Set(aInsertar.map((f) => f.dni).filter(Boolean) as string[]),
      ]
      const personByDni = new Map<string, number>()
      if (dnis.length > 0) {
        for (let i = 0; i < dnis.length; i += 500) {
          const chunk = dnis.slice(i, i + 500)
          const rows = await db
            .select({ id: people.id, documentNumber: people.documentNumber })
            .from(people)
            .where(inArray(people.documentNumber, chunk))
          rows.forEach((p) => personByDni.set(p.documentNumber, p.id))
        }
      }

      const [batch] = await db
        .insert(importBatches)
        .values({
          source: data.source || 'xlsx',
          fileName: data.fileName || null,
          totalRows: filasValidas.length,
          newRows: aInsertar.length,
          existingRows: filasConDni.length - aInsertar.length,
          errorRows: 0,
          noDniRows: sinDni,
          importedBy: user.username,
        })
        .returning({ id: importBatches.id })

      for (let i = 0; i < aInsertar.length; i += 200) {
        const chunk = aInsertar.slice(i, i + 200)
        await db
          .insert(pagosImportados)
          .values(
            chunk.map((f) => ({
              personId: f.dni ? personByDni.get(f.dni) ?? null : null,
              dni: f.dni,
              fechaPago: f.fechaPago,
              periodo: f.periodo,
              nombreSocio: f.nombreSocio,
              pagador: f.pagador,
              categoria: f.categoria,
              importe: String(f.importe),
              formaPago: f.formaPago,
              source: data.source || 'xlsx',
              fingerprint: f.fingerprint,
              importBatchId: batch.id,
            })),
          )
          .onConflictDoNothing({ target: pagosImportados.fingerprint })
      }

      return {
        ok: true as const,
        batchId: batch.id,
        insertados: aInsertar.length,
        omitidos: filasConDni.length - aInsertar.length,
        pendientesAlta: sinDni,
      }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'Error al guardar los pagos' }
    }
  })
  