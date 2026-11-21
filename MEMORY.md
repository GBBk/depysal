# Memoria del proyecto

Contexto vivo entre sesiones. Se actualiza al terminar cada tarea. Máximo ~50 líneas.

## Estado actual
- Hechas: T01 a T12 (scaffold, profiles/RLS, auth, clientes, seed, pagos/asistencias, `client_periods` + `client_status`, planes y pagos, asistencias, panel, deploy de demo, identidad visual, migración de ejercicios/rutinas/días hechos + Storage; aplicada también en la nube).
- Próxima: T13 (biblioteca curada de free-exercise-db en español + script de importación que sube fotos al bucket `exercise-images`; local y nube).
- **Rutinas (T12)**: `exercises.grupo_muscular` y `equipo` guardan la etiqueta en español (lista fija en CHECK). `routine_completions.client_id` lo pone el trigger `set_completion_client` (el default `auth.uid()` es solo para que sea opcional en los tipos). El cliente ve ítems y marca días solo de su rutina activa porque las políticas se apoyan en el RLS de `routines`. Bucket `exercise-images` **privado**: la UI tiene que usar URLs firmadas (`createSignedUrls`), no `getPublicUrl`. Helper `is_active_user()` (SECURITY INVOKER) para las políticas nuevas.
- **Demo**: https://depysal.vercel.app (Vercel, repo `gbbk/depysal`, deploy automático desde `main`) con Supabase Cloud `depysal` (ref `mxrjrmxsgbsxifqpnlgt`, us-east-1). Registro público apagado; admin propio del usuario (el del seed se borró). Cada migración nueva hay que aplicarla también ahí (`db push --remote`); el seed **no** se vuelve a cargar (borraría/duplicaría datos).

## Diseño (T11b)
- Tokens en `src/index.css` (`:root`): fondo gris claro, tarjetas blancas, `primary` naranja con **texto negro** (blanco sobre naranja no da contraste), `sidebar` negro para barras. Usá esos tokens, no colores sueltos (salvo los de estado: verde/ámbar/rojo).
- Piezas compartidas: `app/Brand.tsx` (marca, pensada para fondo negro), `app/PageHeader.tsx` (título + acciones), `clients/ClientAvatar.tsx`. Títulos de sección con barrita naranja (`before:bg-primary`). Formularios dentro de `Card`.
- Admin: barra lateral negra (md+) y pestañas abajo en celular (`AdminLayout`); el `main` deja `pb-24` para las pestañas. Botones e inputs a 36 px (40 px `lg`) para tocarlos cómodo.

## Deploy (T11)
- Supabase CLI v3: el destino por defecto es la base local; para la nube hace falta `--remote` y, al correr desde el agente, `--yes` (con permiso del usuario).
- **No usar `supabase config push`**: pisaría `site_url` y las redirect URLs de la nube con las locales. Los ajustes de Auth de la nube se cambian en el panel.
- Vercel: Vite solo lee variables `VITE_`; las que crea la integración de Supabase (`NEXT_PUBLIC_*`, `SUPABASE_*`, `POSTGRES_*`) no se usan. Cargadas: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (publishable). Después de cambiar variables hay que redeployar.
- Git desde el entorno del agente: el push por HTTPS falla con OpenSSL; usá `git -c http.sslBackend=schannel push`.
- **Usuarios creados antes de aplicar las migraciones no tienen profile** (el trigger no existía): la app muestra "No se pudo cargar tu cuenta". Pasó con el admin de la demo; se arregló insertando su fila en `profiles`. En producción (T19): migraciones primero, usuarios después.
- Consultas a la nube desde el agente: `supabase db query --remote --read-only` (escrituras: `--yes`, con permiso). `information_schema` no muestra grants al rol de solo lectura: usá `has_table_privilege`.
- `vercel link` agrega `.env*` al `.gitignore` (tapa `.env.example`): sacarlo si vuelve a aparecer.
- **Seed local**: `admin@deporteysalud.test` / `admin1234`; clientes `<nombre>.<apellido>@deporteysalud.test` / `cliente1234`. Los estados que deja están en el encabezado de pagos de `supabase/seed.sql` (10 al día, 3 por vencer, 5 vencidos, 2 inactivos). Son relativos a hoy: hacé `db reset` si pasaron días.
- `/app` muestra solo un título (inicio del cliente en T16).
- **Pendiente para T19**: los planes viven solo en el seed (precios de ejemplo); en producción hay que cargarlos.

## Cómo está armado
- Auth: `AuthProvider` → `useAuth()`; `useProfile()`; `RequireArea` protege `/admin` y `/app` (reglas en `features/auth/access.ts`).
- Clientes: alta por la Edge Function `create-client` (401/403/409 con `field`); edición y baja directo sobre `profiles`. El email no se edita (es el usuario de Auth). DNI obligatorio en el formulario. Las reglas zod están duplicadas en `features/clients/schemas.ts` y en la función: si cambia una, cambiá la otra. Búsqueda en memoria (`filterClients`).
- Pagos/asistencias: IDs `bigint identity`. `payments.clases` lo pone el trigger `copy_plan_clases`. Pagos sin DELETE (se anulan); asistencias se borran. FKs a `profiles` sin cascade.
- UI admin (T08): `/admin/clientes/:id` es la ficha (datos, período actual, en espera, registrar pago, historial); la edición pasó a `/admin/clientes/:id/editar`. `/admin/planes` edita planes. Formularios con valores string y conversión en `toPlanUpdate`/`toPaymentInsert` (con tests). Fechas y moneda: `src/lib/format.ts` (`todayISO`, `formatDate`, `formatMoney`). Query keys: `['client-status']`, `['periods', id]`, `['payments', id]`; un pago invalida las tres.
- Asistencias (T09): el trigger `check_attendance_allowed` rechaza con mensaje `debe_abonar` o `pase_libre` (P0001) si en esa fecha no hay período con clases; vale para cualquier fecha. La UI muestra el aviso de hoy con `attendanceAvailability(client_status)` y traduce los errores con `attendanceErrorMessage`. Por eso los tests no pueden insertar asistencias fuera de un período: armá el escenario con pagos antes.
- Panel (T10): listas y contador solo de clientes **activos**. Ingresos = pagos no anulados del mes (Argentina), sumados en el front (`useMonthlyIncome`). WhatsApp: `toWhatsAppNumber` normaliza a `549…` (saca 0 y 15); si no puede, muestra "Sin teléfono". La app y el gimnasio se llaman **Deporte y Salud**; "Depysal" no se muestra en ningún lado (solo queda en identificadores técnicos: package, repo, proyecto de Supabase y URL de Vercel).
- `client_status`: "hoy" es la fecha de Argentina (`now() at time zone 'America/Argentina/Buenos_Aires'`). Columnas extra a la spec: `plan_nombre` y `desde` (para mostrar el período actual).

## Decisiones (y por qué)
- **Registro público desactivado** (`enable_signup = false`): la spec no lo permite y con la clave pública cualquiera se registraba.
- **`handle_new_user` siempre crea `rol = 'client'`**: el rol nunca sale de metadatos; un admin se crea actualizando `profiles.rol`. (`app_metadata` no sirve: GoTrue lo escribe después del INSERT.)
- **Sin DELETE en `profiles`** (baja lógica). `profiles.dni` nullable y único (un admin puede no tenerlo).
- **Estado con período en espera = `al_dia`** aunque el actual ya no esté vigente (p. ej. usó la última clase hoy y ya pagó el siguiente): la spec dice "o ya tiene el siguiente período pago en espera" y el cliente no pierde nada. Si hay que cambiarlo, es en la vista y con test.
- **Tests con service role**: `SUPABASE_SERVICE_ROLE_KEY` en `.env` (sin `VITE_`). Helpers en `tests/helpers.ts`.

## Errores a evitar
- **Docker en Windows**: `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`; si una terminal vieja no lo encuentra, agregalo al PATH.
- **`config.toml`, funciones nuevas o funciones locales que responden 503** (pasó después de un `functions deploy` a la nube): `supabase stop` + `supabase start`. Migraciones y seed: `supabase db reset`.
- **504 "Outdated Optimize Dep" o pantalla en blanco**: Vite reoptimizando; recargá.
- **"No se pudo cargar tu cuenta" después de `db reset`**: la sesión guardada es de un usuario que ya no existe; cerrá sesión y entrá de nuevo.
- **Fechas de `client_status` en tests**: relativas a hoy en Argentina (ver `T()` en `tests/client-periods.test.ts`).
- **Seed**: no llames funciones volátiles dentro de un `WHERE` (corren por fila); usá `DO` o `select f()`. Usuarios por SQL necesitan `auth.identities` y los `*_token` en `''`.
- **Tipos**: generalos con `npm run db:types` (desde PowerShell, `Out-File` agrega BOM).