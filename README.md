# Depysal

App de gestión para un gimnasio chico: clientes, pagos, asistencias y rutinas.

- Qué hace la app: [`SPEC.md`](SPEC.md)
- Orden de trabajo: [`TASKS.md`](TASKS.md)
- Reglas para el agente: [`CLAUDE.md`](CLAUDE.md) · estado y decisiones: [`MEMORY.md`](MEMORY.md)

## Desarrollo local

Requisitos: Node.js y Docker Desktop abierto.

```powershell
npm install
npm run db:start      # Supabase local (la primera vez descarga las imágenes)
copy .env.example .env
```

Completá `.env` con la `PUBLISHABLE_KEY` (en `VITE_SUPABASE_ANON_KEY`) y la `SECRET_KEY` (en `SUPABASE_SERVICE_ROLE_KEY`, solo para los tests) que muestra `npm run db:start`. Después:

```powershell
npm run db:reset      # aplica migraciones y carga el seed
npm run dev           # http://localhost:5173
```

Usuarios del seed (solo locales): `admin@depysal.test` / `admin1234` y los clientes `<nombre>.<apellido>@depysal.test` / `cliente1234` (por ejemplo, `ana.perez@depysal.test`).

## Deploy de demo (Supabase Cloud + Vercel)

Las cuentas y contraseñas son tuyas: el agente no las crea ni las escribe.

**1. GitHub.** Creá un repositorio **privado** vacío (sin README) y subí el proyecto:

```powershell
git remote add origin https://github.com/<usuario>/depysal.git
git push -u origin main
```

**2. Supabase Cloud.** En supabase.com creá un proyecto (región *South America (São Paulo)*) y guardá la contraseña de la base. Después, desde la carpeta del proyecto:

```powershell
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push --include-seed
npx supabase functions deploy create-client
```

`link` pide la contraseña de la base; `db push --include-seed` aplica las migraciones y carga el seed (planes y clientes ficticios con pagos y asistencias relativos al día de hoy).

En el panel de Supabase:

- *Authentication → Sign In / Providers*: desactivá **Allow new users to sign up** (no hay registro público).
- *Authentication → URL Configuration*: poné la URL de Vercel como **Site URL** (cuando la tengas).
- *Authentication → Users → Add user*: creá tu admin con tu email y una contraseña segura (marcá *Auto Confirm User*). Después, en *SQL Editor*:

```sql
update public.profiles set rol = 'admin' where email = '<tu-email>';
delete from auth.users where email = 'admin@depysal.test'; -- el admin del seed tiene una contraseña conocida
```

**3. Vercel.** *Add New → Project*, importá el repositorio (Vercel detecta Vite) y cargá estas variables de entorno antes de deployar:

| Variable | Valor (Supabase → *Project Settings → API*) |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`) |

La secret key **no** va en Vercel: solo la usa la Edge Function, que ya la tiene en Supabase. `vercel.json` hace que todas las rutas sirvan `index.html`.

**4. Probar.** Entrá con tu admin, creá un cliente (prueba la Edge Function), registrá un pago y una asistencia, y revisá el panel. Los clientes del seed entran con `<nombre>.<apellido>@depysal.test` / `cliente1234`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` / `lint` / `test` | Verificación (los tests corren contra Supabase local) |
| `npm run build` | Build de producción |
| `npm run db:start` / `db:reset` | Levanta Supabase local / resetea la base con el seed |
| `npm run db:types` | Regenera `src/types/database.ts` |
