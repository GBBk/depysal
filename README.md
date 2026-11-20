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

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` / `lint` / `test` | Verificación (los tests corren contra Supabase local) |
| `npm run build` | Build de producción |
| `npm run db:start` / `db:reset` | Levanta Supabase local / resetea la base con el seed |
| `npm run db:types` | Regenera `src/types/database.ts` |
