export type EstadoVisualCodigo =
  | 'pagada'
  | 'anulada'
  | 'pendiente'
  | 'vencida'
  | 'mora'

export type EstadoVisual = {
  codigo: EstadoVisualCodigo
  label: string
}

function fechaLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Estado de visualización. No modifica la base.
 * pendiente + vencimiento día 15:
 * - hasta el 15 inclusive → Pendiente
 * - del 16 al fin de ese mes → Vencida
 * - a partir del mes siguiente → En mora
 */
export function estadoCuotaVisual(params: {
  estado: string
  fechaVencimiento?: string | Date | null
  /** Fecha de referencia (por defecto hoy local) */
  fechaReferencia?: Date
}): EstadoVisual {
  const estado = String(params.estado || '').toLowerCase()

  if (estado === 'pagada') {
    return { codigo: 'pagada', label: 'Pagada' }
  }
  if (estado === 'anulada') {
    return { codigo: 'anulada', label: 'Anulada' }
  }
  if (estado !== 'pendiente') {
    return { codigo: 'pendiente', label: params.estado || '—' }
  }

  const hoy = fechaLocalISO(params.fechaReferencia)
  const venc = params.fechaVencimiento
    ? String(params.fechaVencimiento).slice(0, 10)
    : null

  if (!venc) {
    return { codigo: 'pendiente', label: 'Pendiente' }
  }

  if (hoy <= venc) {
    return { codigo: 'pendiente', label: 'Pendiente' }
  }

  const [vy, vm] = venc.split('-').map(Number)
  const [hy, hm] = hoy.split('-').map(Number)

  // Mismo año-mes del vencimiento → vencida; después → mora
  if (hy === vy && hm === vm) {
    return { codigo: 'vencida', label: 'Vencida' }
  }
  if (hy > vy || (hy === vy && hm > vm)) {
    return { codigo: 'mora', label: 'En mora' }
  }

  return { codigo: 'pendiente', label: 'Pendiente' }
}

export function colorEstadoVisual(codigo: EstadoVisualCodigo): string {
  switch (codigo) {
    case 'pagada':
      return 'text-green-700'
    case 'pendiente':
      return 'text-amber-700'
    case 'vencida':
      return 'text-orange-700'
    case 'mora':
      return 'text-red-700'
    case 'anulada':
      return 'text-gray-500'
    default:
      return 'text-gray-700'
  }
}