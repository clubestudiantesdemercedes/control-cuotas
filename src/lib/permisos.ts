export const MODULOS = [
  {
    key: 'personas',
    label: 'Personas',
    acciones: [
      { key: 'ver', label: 'Ver / consultar' },
      { key: 'editar', label: 'Crear / editar / baja' },
    ],
  },
  {
    key: 'deportes',
    label: 'Deportes',
    acciones: [
      { key: 'ver', label: 'Ver' },
      { key: 'editar', label: 'Editar disciplinas y categorías' },
    ],
  },
  {
    key: 'cuotas',
    label: 'Cuotas',
    acciones: [
      { key: 'ver', label: 'Ver listado' },
      { key: 'generar', label: 'Generar cuotas' },
      { key: 'anular', label: 'Anular cuotas' },
    ],
  },
  {
    key: 'pagos',
    label: 'Pagos',
    acciones: [
      { key: 'ver', label: 'Ver / registrar' },
      { key: 'registrar', label: 'Registrar pago individual' },
      { key: 'importar', label: 'Importar Excel' },
    ],
  },
  {
    key: 'tarifario',
    label: 'Tarifario',
    acciones: [
      { key: 'ver', label: 'Ver' },
      { key: 'editar', label: 'Editar tarifas' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    acciones: [
      { key: 'ver', label: 'Ver' },
      { key: 'editar', label: 'Modificar config / padrón / medios' },
    ],
  },
  {
    key: 'usuarios',
    label: 'Usuarios',
    acciones: [
      { key: 'ver', label: 'Ver listado' },
      { key: 'editar', label: 'Crear / desactivar / cambiar roles' },
    ],
  },
] as const

export type PermisosMap = Record<string, Record<string, boolean>>

export function permisosVacios(): PermisosMap {
  const p: PermisosMap = {}
  for (const m of MODULOS) {
    p[m.key] = {}
    for (const a of m.acciones) p[m.key][a.key] = false
  }
  return p
}

/** Admin tiene todo; si no, lee el mapa */
export function tienePermiso(
  user: { role: string; permissions?: PermisosMap | null },
  modulo: string,
  accion: string,
): boolean {
  if (user.role === 'admin') return true
  const perms = user.permissions || {}
  return Boolean(perms[modulo]?.[accion])
}

export function puedeVerModulo(
  user: { role: string; permissions?: PermisosMap | null },
  modulo: string,
): boolean {
  if (user.role === 'admin') return true
  const perms = user.permissions?.[modulo]
  if (!perms) return false
  return Object.values(perms).some(Boolean)
}

/** Plantilla útil para “solo pagos” */
export function plantillaCargadorPagos(): PermisosMap {
  const p = permisosVacios()
  p.pagos = { ver: true, registrar: true, importar: true }
  return p
}