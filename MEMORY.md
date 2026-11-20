# Memoria del proyecto

Contexto vivo entre sesiones. Se actualiza al terminar cada tarea. Máximo ~50 líneas.

## Estado actual
- Hechas: T01 (scaffold), T02 (profiles + `is_admin()` + RLS + trigger), T03 (login y rutas por rol), T04 (clientes).
- Próxima: T05 (seed: 1 admin, ~20 clientes, ejercicios).
- `/admin` y `/app` muestran solo un título: el panel se arma en T10 y el inicio del cliente en T15.
- **Pendiente para T07/T08**: el filtro del listado de clientes por estado de cuota (necesita `client_status`) y la ficha completa (hoy `/admin/clientes/:id` es solo edición + baja).

## Clientes (T04)
- Alta por la Edge Function `create-client` (verifica `is_admin()` con el token de quien llama; 401 sin sesión, 403 si no es admin, 409 con `field` si el DNI o el email se repiten). Edición y baja directo sobre `profiles` (política de update del admin).
- La contraseña inicial la escribe el admin en el alta. El email **no se edita** (es el usuario de Auth; cambiarlo requeriría otra función).
- El DNI es obligatorio en el formulario (7 u 8 dígitos) aunque en la base sea nullable.
- Las reglas zod están duplicadas en `src/features/clients/schemas.ts` y en la función (Deno no comparte imports con `src/`): si cambia una, cambiá la otra.
- Búsqueda en memoria (`filterClients`, sin tildes, nombre/apellido/DNI): con < 120 clientes no hace falta buscar en el servidor.

## Cómo está armada la auth (T03)
- `AuthProvider` (sesión vía `onAuthStateChange`) → `useAuth()`; `useProfile()` lee el profile propio con TanStack Query.
- `RequireArea` protege `/admin` y `/app`; sin `area` (en `/`) redirige a la sección de cada rol. Reglas puras en `features/auth/access.ts` (con tests).
- Cliente inactivo: ve "Tu cuenta está inactiva" en `/app`. **Pendiente en la base**: las políticas de T06 y T12 para clientes deben exigir `activo = true`; hoy solo bloquea la UI (el cliente solo puede leer su propio profile).

## Decisiones (y por qué)
- **Registro público desactivado** (`enable_signup = false` en `supabase/config.toml`): la spec dice que no hay registro público y, con la clave pública, cualquiera podía crearse una cuenta. `auth.admin.createUser` sigue funcionando.
- **El trigger `handle_new_user` siempre crea `rol = 'client'`**: el rol nunca sale de los metadatos. Para tener un admin se actualiza `profiles.rol` (seed, service role u otro admin). Leerlo de `app_metadata` no sirve: GoTrue lo escribe después del INSERT, cuando el trigger ya corrió.
- **Sin política de DELETE en `profiles`**: los clientes nunca se borran (baja lógica con `activo`).
- **`profiles.dni` es nullable y único**: un admin puede no tenerlo.
- **Tests con service role**: `SUPABASE_SERVICE_ROLE_KEY` en `.env` (sin prefijo `VITE_`, así nunca llega al frontend). Vitest carga `.env` con `loadEnv`. Helpers en `tests/helpers.ts` (`createUser`, `deleteUsers`, `anonClient`).
- **`tsconfig.test.json`**: los tests también se chequean en modo strict con `npm run typecheck`.
- **Lint**: `react-refresh/only-export-components` está apagado solo en `src/components/ui/` (shadcn exporta variantes junto a los componentes).
- **Commits**: solo la línea de título (por ejemplo, `feat: ... (T02)`), sin cuerpo ni `Co-Authored-By`.

## Errores a evitar
- **Docker en Windows**: está en `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`. Si una terminal vieja no encuentra `docker`, agregalo al PATH o abrí una terminal nueva.
- **Cambios en `supabase/config.toml` o funciones nuevas**: requieren `supabase stop` + `supabase start` (el edge runtime solo detecta funciones al arrancar); las migraciones se aplican con `supabase db reset`.
- **Pantalla en blanco o 504 "Outdated Optimize Dep" en el navegador**: Vite reoptimizando dependencias nuevas; recargá.
- **Escapes Unicode en regex**: escribí `\p{Diacritic}` con flag `u` en vez de rangos `̀-ͯ` (terminaron como caracteres invisibles).
- **Generar tipos desde PowerShell**: `Out-File -Encoding utf8` agrega BOM; quitalo o usá `npm run db:types`.
- **`supabase.auth.getSession()` no prueba la conexión**: lee el almacenamiento local. Para chequear, usá `/auth/v1/health`.
- **Archivos de la plantilla de Vite sin usar** (`src/App.tsx`, `src/App.css`, `src/assets/`, `public/icons.svg`): el borrado automático fue bloqueado; quedan pendientes de borrar a mano.
