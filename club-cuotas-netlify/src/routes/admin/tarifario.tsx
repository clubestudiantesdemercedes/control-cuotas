import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/tarifario')({
  component: TarifarioPage,
})

function TarifarioPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Tarifario</h2>
      <p className="text-sm text-gray-500">
        Próximamente: valores de cuotas sociales y deportivas.
      </p>
    </div>
  )
}