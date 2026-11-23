import { createBrowserRouter, Navigate } from 'react-router'
import { AttendanceControlPage } from '@/features/attendances/AttendanceControlPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { AccountPage } from '@/features/client-app/AccountPage'
import { HomePage } from '@/features/client-app/HomePage'
import { MyRoutinePage } from '@/features/client-app/MyRoutinePage'
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
          { path: 'asistencias', element: <AttendanceControlPage /> },
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
        children: [
          { index: true, element: <HomePage /> },
          { path: 'rutina', element: <MyRoutinePage /> },
          { path: 'cuenta', element: <AccountPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
