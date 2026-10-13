/** Edad cumplida a una fecha de referencia (YYYY-MM-DD). */
export function edadAFecha(
  birthDate: string | Date | null | undefined,
  fechaRef: string,
): number | null {
  if (!birthDate) return null
  const nac = String(birthDate).slice(0, 10)
  const ref = String(fechaRef).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nac) || !/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    return null
  }
  const [ny, nm, nd] = nac.split('-').map(Number)
  const [ry, rm, rd] = ref.split('-').map(Number)
  let edad = ry - ny
  if (rm < nm || (rm === nm && rd < nd)) edad--
  return edad < 0 ? 0 : edad
}

/** Categoría social automática (no aplica a vitalicio). */
export function categoriaSocialPorEdad(
  birthDate: string | Date | null | undefined,
  fechaRef: string,
): 'menor' | 'cadete' | 'activo' | null {
  const edad = edadAFecha(birthDate, fechaRef)
  if (edad == null) return null
  if (edad < 12) return 'menor'
  if (edad < 18) return 'cadete'
  return 'activo'
}

export function labelCategoriaSocial(c: string | null | undefined): string {
  if (c === 'menor') return 'Menor'
  if (c === 'cadete') return 'Cadete'
  if (c === 'activo') return 'Activo'
  if (c === 'vitalicio') return 'Vitalicio'
  return c || '—'
}