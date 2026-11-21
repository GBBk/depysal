# Memoria del proyecto

Contexto vivo entre sesiones. Se actualiza al terminar cada tarea. Máximo ~50 líneas.

## Estado actual
- Hechas: T01 a T10 (scaffold, profiles/RLS, auth, clientes, seed, pagos/asistencias, `client_periods` + `client_status`, planes y pagos, asistencias, panel principal).
- Próxima: T11 (deploy de demo: Supabase Cloud + Vercel/Netlify). Necesita cuentas del usuario: el usuario crea los proyectos y pasa los datos; nada de credenciales escritas por el agente.
- **Seed local**: `admin@depysal.test` / `admin1234`; clientes `<nombre>.<apellido>@depysal.test` / `cliente1234`. Los estados que deja están en el encabezado de pagos de `supabase/seed.sql` (10 al día, 3 por vencer, 5 vencidos, 2 inactivos). Son relativos a hoy: hacé `db reset` si pasaron días.
- `/app` muestra solo un título (inicio del cliente en T15).
- **Pendiente para T18**: los planes viven solo en el seed (precios de ejemplo); en producción hay que cargarlos.

## Cómo está armado
- Auth: `AuthProvider` → `useAuth()`; `useProfile()`; `RequireArea` protege `/admin` y `/app` (reglas en `features/auth/access.ts`).
- Clientes: alta por la Edge Function `create-client` (401/403/409 con `field`); edición y baja directo sobre `profiles`. El email no se edita (es el usuario de Auth). DNI obligatorio en el formulario. Las reglas zod están duplicadas en `features/clients/schemas.ts` y en la función: si cambia una, cambiá la otra. Búsqueda en memoria (`filterClients`).
- Pagos/asistencias: IDs `bigint identity`. `payments.clases` lo pone el trigger `copy_plan_clases`. Pagos sin DELETE (se anulan); asistencias se borran. FKs a `profiles` sin cascade.
- UI admin (T08): `/admin/clientes/:id` es la ficha (datos, período actual, en espera, registrar pago, historial); la edición pasó a `/admin/clientes/:id/editar`. `/admin/planes` edita planes. Formularios con valores string y conversión en `toPlanUpdate`/`toPaymentInsert` (con tests). Fechas y moneda: `src/lib/format.ts` (`todayISO`, `formatDate`, `formatMoney`). Query keys: `['client-status']`, `['periods', id]`, `['payments', id]`; un pago invalida las tres.
- Asistencias (T09): el trigger `check_attendance_allowed` rechaza con mensaje `debe_abonar` o `pase_libre` (P0001) si en esa fecha no hay período con clases; vale para cualquier fecha. La UI muestra el aviso de hoy con `attendanceAvailability(client_status)` y traduce los errores con `attendanceErrorMessage`. Por eso los tests no pueden insertar asistencias fuera de un período: armá el escenario con pagos antes.
- Panel (T10): listas y contador solo de clientes **activos**. Ingresos = pagos no anulados del mes (Argentina), sumados en el front (`useMonthlyIncome`). WhatsApp: `toWhatsAppNumber` normaliza a `549…` (saca 0 y 15); si no puede, muestra "Sin teléfono". El gimnasio se llama **Deporte y Salud** (Depysal es el nombre de la app): así figura en el mensaje.
- `client_status`: "hoy" es la fecha de Argentina (`now() at time zone 'America/Argentina/Buenos_Aires'`). Columnas extra a la spec: `plan_nombre` y `desde` (para mostrar el período actual).

## Decisiones (y por qué)
- **Registro público desactivado** (`enable_signup = false`): la spec no lo permite y con la clave pública cualquiera se registraba.
- **`handle_new_user` siempre crea `rol = 'client'`**: el rol nunca sale de metadatos; un admin se crea actualizando `profiles.rol`. (`app_metadata` no sirve: GoTrue lo escribe después del INSERT.)
- **Sin DELETE en `profiles`** (baja lógica). `profiles.dni` nullable y único (un admin puede no tenerlo).
- **Estado con período en espera = `al_dia`** aunque el actual ya no esté vigente (p. ej. usó la última clase hoy y ya pagó el siguiente): la spec dice "o ya tiene el siguiente período pago en espera" y el cliente no pierde nada. Si hay que cambiarlo, es en la vista y con test.
- **Tests con service role**: `SUPABASE_SERVICE_ROLE_KEY` en `.env` (sin `VITE_`). Helpers en `tests/helpers.ts`.
- **Lint**: `react-refresh/only-export-components` apagado solo en `src/components/ui/`.

## Errores a evitar
- **Docker en Windows**: `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`; si una terminal vieja no lo encuentra, agregalo al PATH.
- **`config.toml` o funciones nuevas**: requieren `supabase stop` + `supabase start`. Migraciones y seed: `supabase db reset`.
- **504 "Outdated Optimize Dep" o pantalla en blanco**: Vite reoptimizando; recargá.
- **"No se pudo cargar tu cuenta" después de `db reset`**: la sesión guardada es de un usuario que ya no existe; cerrá sesión y entrá de nuevo.
- **Fechas de `client_status` en tests**: relativas a hoy en Argentina (ver `T()` en `tests/client-periods.test.ts`).
- **Seed**: no llames funciones volátiles dentro de un `WHERE` (corren por fila); usá `DO` o `select f()`. Usuarios por SQL necesitan `auth.identities` y los `*_token` en `''`.
- **Regex de tildes**: usá `\p{Diacritic}` con flag `u` (los rangos con escapes Unicode terminaron como caracteres invisibles).
- **Tipos**: generalos con `npm run db:types` (desde PowerShell, `Out-File` agrega BOM).