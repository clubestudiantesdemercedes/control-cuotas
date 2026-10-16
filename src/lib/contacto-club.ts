export const WHATSAPP_SECRETARIA = '5492324500222'
export const WHATSAPP_SECRETARIA_DISPLAY = '2324 500-222'
export const WHATSAPP_SECRETARIA_URL = `https://wa.me/${WHATSAPP_SECRETARIA}`

export function mensajeContactoSecretaria(prefijo?: string) {
  const base = `Acercate a secretaría o escribinos por WhatsApp al ${WHATSAPP_SECRETARIA_DISPLAY}.`
  return prefijo ? `${prefijo} ${base}` : base
}