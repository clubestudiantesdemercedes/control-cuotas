import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/pagos')({
  component: PagosPage,
})

function PagosPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Pagos</h2>
      <p className="text-sm text-gray-500">
        Próximamente: carga de pagos e imputación a períodos.
      </p>
    </div>
  )
}