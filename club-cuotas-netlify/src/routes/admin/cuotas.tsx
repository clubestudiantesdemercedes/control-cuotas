import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/cuotas')({
  component: CuotasPage,
})

function CuotasPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Cuotas</h2>
      <p className="text-sm text-gray-500">
        Próximamente: generación masiva y consulta de cuotas.
      </p>
    </div>
  )
}