import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireArea } from '@/features/auth/RequireArea'
import { ClientDetailPage } from '@/features/clients/ClientDetailPage'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { EditClientPage } from '@/features/clients/EditClientPage'
import { NewClientPage } from '@/features/clients/NewClientPage'
import { PlansPage } from '@/features/plans/PlansPage'
import { AdminLayout } from './AdminLayout'
import { ClientLayout } from './ClientLayout'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // `/` manda a cada usuario a su sección (o al login).
  { path: '/', element: <RequireArea /> },
  {
    path: '/admin',
    element: <RequireArea area="admin" />,
    children: [
      {
        element: <AdminLayout />,
        // El panel principal se arma en T10.
        children: [
          { index: true, element: <h1 className="text-xl font-semibold">Panel</h1> },
          { path: 'clientes', element: <ClientsPage /> },
          { path: 'clientes/nuevo', element: <NewClientPage /> },
          { path: 'clientes/:id', element: <ClientDetailPage /> },
          { path: 'clientes/:id/editar', element: <EditClientPage /> },
          { path: 'planes', element: <PlansPage /> },
        ],
      },
    ],
  },
  {
    path: '/app',
    element: <RequireArea area="app" />,
    children: [
      {
        element: <ClientLayout />,
        // El inicio del cliente se arma en T15.
        children: [{ index: true, element: <h1 className="text-xl font-semibold">Inicio</h1> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
