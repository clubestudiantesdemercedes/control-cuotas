export const CLAVES_TARIFA = [
  { tipoCuota: 'social', clave: 'menor', label: 'Social · Menor', montoDefault: '0' },
  { tipoCuota: 'social', clave: 'cadete', label: 'Social · Cadete', montoDefault: '15000' },
  { tipoCuota: 'social', clave: 'activo', label: 'Social · Activo', montoDefault: '15000' },
  { tipoCuota: 'social', clave: 'vitalicio', label: 'Social · Vitalicio', montoDefault: '0' },
  {
    tipoCuota: 'social',
    clave: '3_familiar',
    label: 'Social · 3.º familiar',
    montoDefault: '11000',
  },
  {
    tipoCuota: 'social',
    clave: '4_familiar',
    label: 'Social · 4.º familiar o superior',
    montoDefault: '8000',
  },
  {
    tipoCuota: 'deportiva',
    clave: 'deportista_pleno',
    label: 'Deportiva · Pleno',
    montoDefault: '25000',
  },
  {
    tipoCuota: 'deportiva',
    clave: '2_hermano',
    label: 'Deportiva · 2.º hermano',
    montoDefault: '18000',
  },
  {
    tipoCuota: 'deportiva',
    clave: '3_hermano',
    label: 'Deportiva · 3.º hermano',
    montoDefault: '0',
  },
] as const