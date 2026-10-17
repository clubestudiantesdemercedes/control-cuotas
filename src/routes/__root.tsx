import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Control de Cuotas - Club' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-gray-800">
          Página no encontrada
        </p>
        <a href="/" className="text-blue-700 underline text-sm">
          Volver al inicio
        </a>
      </div>
    </div>
  ),
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  )
}