import { createServerFn } from '@tanstack/react-start'
import { requireUser } from './auth.server'

export const previsualizarCategoriaDeportiva = createServerFn({
  method: 'GET',
})
  .inputValidator((data: { disciplinaId: number; birthDate: string }) => data)
  .handler(async ({ data }) => {
    await requireUser()
    const { resolverCategoriaDeportiva } = await import('./deportes.server')
    return resolverCategoriaDeportiva(data.disciplinaId, data.birthDate)
  })