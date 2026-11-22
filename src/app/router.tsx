import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireArea } from '@/features/auth/RequireArea'
import { ClientDetailPage } from '@/features/clients/ClientDetailPage'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { EditClientPage } from '@/features/clients/EditClientPage'
import { NewClientPage } from '@/features/clients/NewClientPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ExerciseFormPage } from '@/features/exercises/ExerciseFormPage'
import { ExercisesPage } from '@/features/exercises/ExercisesPage'
import { PlansPage } from '@/features/plans/PlansPage'
import { RoutineEditorPage } from '@/features/routines/RoutineEditorPage'
import { RoutinesPage } from '@/features/routines/RoutinesPage'
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
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'clientes', element: <ClientsPage /> },
          { path: 'clientes/nuevo', element: <NewClientPage /> },
          { path: 'clientes/:id', element: <ClientDetailPage /> },
          { path: 'clientes/:id/editar', element: <EditClientPage /> },
          { path: 'ejercicios', element: <ExercisesPage /> },
          { path: 'ejercicios/nuevo', element: <ExerciseFormPage /> },
          { path: 'ejercicios/:id', element: <ExerciseFormPage /> },
          { path: 'rutinas', element: <RoutinesPage /> },
          { path: 'rutinas/:id', element: <RoutineEditorPage /> },
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
        // El inicio del cliente se arma en T16.
        children: [{ index: true, element: <h1 className="text-xl font-semibold">Inicio</h1> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
