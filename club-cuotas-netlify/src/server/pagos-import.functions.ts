import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import { db } from '../../db'
import { people, pagosImportados, importBatches } from '../../db/schema'
import { requireUser } from './auth.server'

export type FilaPagoPreview = {
  dni: string | null
  fechaPago: string
  periodo: string
  nombreSocio: string | null
  pagador: string | null
  categoria: string | null
  importe: number
  formaPago: string | null
  fingerprint: string
  estado: 'nuevo' | 'existente' | 'error'
  error?: string
}

function excelDateToIso(value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number') {
    // serial Excel
    const d = XLSX.SSF.parse_date_code(value)
    if (!d) return null
    const mm = String(d.m).padStart(2, '0')
    const dd = String(d.d).padStart(2, '0')
    return `${d.y}-${mm}-${dd}`
  }
  const s = String(value).trim()
  // ya viene ISO o similar
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  // dd/mm/yyyy
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m2) {
    return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
  }
  return null
}

function periodoFromValue(value: unknown): string | null {
  const iso = excelDateToIso(value)
  if (iso) return iso.slice(0, 7) // 2026-02
  const s = String(value ?? '').trim()
  if (/^\d{4}-\d{2}$/.test(s)) return s
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
  const base = [
    row.dni || '',
    row.fechaPago,
    row.periodo,
    String(row.importe),
    (row.categoria || '').toLowerCase().trim(),
    (row.formaPago || '').toLowerCase().trim(),
    (row.nombreSocio || '').toLowerCase().trim(),
  ].join('|')
  return base
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

  // Buscar fila de encabezados
  let headerRow = 0
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const row = raw[i].map((c) => String(c).toLowerCase())
    if (row.includes('dni') && row.some((c) => c.includes('fecha'))) {
      headerRow = i
      break
    }
  }

  const headers = raw[headerRow].map((h) => String(h).trim().toLowerCase())
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

    const fechaPago = excelDateToIso(idx.fecha >= 0 ? row[idx.fecha] : null)
    const periodo = periodoFromValue(idx.periodo >= 0 ? row[idx.periodo] : null)
    const importe = parseImporte(idx.importe >= 0 ? row[idx.importe] : null)
    const dni = normalizarDni(idx.dni >= 0 ? row[idx.dni] : null)
    const nombreSocio =
      idx.socio >= 0 && row[idx.socio] != null && row[idx.socio] !== ''
        ? String(row[idx.socio]).trim()
        : null
    const pagador =
      idx.pagador >= 0 && row[idx.pagador] != null && row[idx.pagador] !== ''
        ? String(row[idx.pagador]).trim()
        : null
    const categoria =
      idx.categoria >= 0 && row[idx.categoria] != null && row[idx.categoria] !== ''
        ? String(row[idx.categoria]).trim()
        : null
    const formaPago =
      idx.forma >= 0 && row[idx.forma] != null && row[idx.forma] !== ''
        ? String(row[idx.forma]).trim()
        : null

    // Fila sin datos de pago
    if (!fechaPago && !periodo && importe == null && !nombreSocio) continue

    if (!fechaPago || !periodo || importe == null) {
      filas.push({
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
        error: 'Falta fecha, período o importe',
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

export const previewImportPagos = createServerFn({ method: 'POST' })
  .inputValidator((data: { fileBase64: string; fileName?: string }) => data)
  .handler(async ({ data }) => {
    await requireUser()

    try {
      const binary = Buffer.from(data.fileBase64, 'base64')
      const filas = parseDetalleBuffer(binary.buffer.slice(
        binary.byteOffset,
        binary.byteOffset + binary.byteLength,
      ))

      const fingerprints = filas
        .filter((f) => f.estado !== 'error')
        .map((f) => f.fingerprint)

      let existentes = new Set<string>()
      if (fingerprints.length > 0) {
        // consultar en chunks
        const chunkSize = 500
        for (let i = 0; i < fingerprints.length; i += chunkSize) {
          const chunk = fingerprints.slice(i, i + chunkSize)
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
        if (!f.dni) sinDni++
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
        // solo primeras 50 nuevas para la vista
        muestraNuevos: resultado.filter((f) => f.estado === 'nuevo').slice(0, 50),
        muestraErrores: resultado.filter((f) => f.estado === 'error').slice(0, 20),
        // guardamos todas las nuevas en el cliente para confirmar (o re-enviamos archivo)
        todasNuevas: resultado.filter((f) => f.estado === 'nuevo'),
      }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'No se pudo leer el archivo Excel' }
    }
  })

export const confirmarImportPagos = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      fileName?: string
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

    if (!data.filas?.length) {
      return { ok: false as const, error: 'No hay filas nuevas para importar' }
    }

    try {
      // re-chequear fingerprints por si hubo otra importación
      const fps = data.filas.map((f) => f.fingerprint)
      const existentes = new Set<string>()
      for (let i = 0; i < fps.length; i += 500) {
        const chunk = fps.slice(i, i + 500)
        const found = await db
          .select({ fingerprint: pagosImportados.fingerprint })
          .from(pagosImportados)
          .where(inArray(pagosImportados.fingerprint, chunk))
        found.forEach((f) => existentes.add(f.fingerprint))
      }

      const aInsertar = data.filas.filter((f) => !existentes.has(f.fingerprint))
      const sinDni = aInsertar.filter((f) => !f.dni).length

      // mapear DNI → personId
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
          source: 'xlsx',
          fileName: data.fileName || null,
          totalRows: data.filas.length,
          newRows: aInsertar.length,
          existingRows: data.filas.length - aInsertar.length,
          errorRows: 0,
          noDniRows: sinDni,
          importedBy: user.username,
        })
        .returning({ id: importBatches.id })

      // insertar en lotes
      for (let i = 0; i < aInsertar.length; i += 200) {
        const chunk = aInsertar.slice(i, i + 200)
        await db.insert(pagosImportados).values(
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
            source: 'xlsx',
            fingerprint: f.fingerprint,
            importBatchId: batch.id,
          })),
        )
      }

      return {
        ok: true as const,
        batchId: batch.id,
        insertados: aInsertar.length,
        omitidos: data.filas.length - aInsertar.length,
        sinDni,
      }
    } catch (err) {
      console.error(err)
      return { ok: false as const, error: 'Error al guardar los pagos' }
    }
  })
  