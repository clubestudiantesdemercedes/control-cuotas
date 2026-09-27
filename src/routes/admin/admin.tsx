import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/admin')({
  component: AdminHome,
})

function AdminHome() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Inicio</h2>
      <p className="text-gray-600 text-sm mb-4">
        Panel de administración del sistema de cuotas.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="font-medium text-gray-800">Personas</p>
          <p className="text-xs text-gray-500 mt-1">
            Alta y consulta de personas y membresías.
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="font-medium text-gray-800">Cuotas</p>
          <p className="text-xs text-gray-500 mt-1">
            Generación masiva y listado de cuotas.
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="font-medium text-gray-800">Pagos</p>
          <p className="text-xs text-gray-500 mt-1">
            Carga individual y masiva con imputación.
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="font-medium text-gray-800">Tarifario</p>
          <p className="text-xs text-gray-500 mt-1">
            Valores de cuotas sociales y deportivas.
          </p>
        </div>
      </div>
    </div>
  )
}