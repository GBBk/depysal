# Reglas para el agente — Depysal

## Contexto
App de gestión para un gimnasio chico (< 120 clientes). La fuente de verdad es `SPEC.md`; el orden de trabajo está en `TASKS.md`. Priorizá siempre la solución más simple que cumpla la spec.

## Forma de trabajo
1. Antes de empezar, leé `SPEC.md` y la próxima tarea sin marcar en `TASKS.md`.
2. Hacé **solo esa tarea**. No adelantes tareas futuras ni agregues funciones que no están en la spec.
3. Si algo de la spec es ambiguo o contradictorio, **preguntá** antes de decidir.
4. Al terminar, corré `npm run typecheck && npm run lint && npm test`, marcá la tarea en `TASKS.md` y proponé un mensaje de commit.
5. Nada de la sección "Fuera de alcance" de la spec se implementa sin pedido explícito.

## Stack y convenciones
- Vite + React + TypeScript en modo `strict`. Prohibido `any`; usá `unknown` y validá.
- Tipos de la base de datos: `src/types/database.ts`, generado con `supabase gen types typescript --local`. No se edita a mano.
- Datos: TanStack Query. Un archivo de hooks por recurso en `src/features/<recurso>/api.ts` (por ejemplo, `useClients`, `useCreatePayment`).
- Formularios: react-hook-form + zod. Los esquemas zod viven junto al feature.
- UI: shadcn/ui + Tailwind. No agregues otras librerías de componentes.
- **No agregues dependencias nuevas sin preguntar.**
- Textos de la UI en español (Argentina). Código, nombres de variables y commits en inglés; los nombres de tablas y columnas siguen la spec.
- Fechas de negocio (`fecha_pago`, `desde`, `hasta`, `attendances.fecha`) son `date` sin hora. Mostralas con `toLocaleDateString('es-AR')`.
- Moneda: ARS, formateada con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`.

## Estructura
```
src/
  app/            router, providers, layouts (AdminLayout, ClientLayout)
  features/
    auth/
    clients/
    plans/
    payments/
    exercises/
    routines/
    client-app/   vistas del rol cliente
  components/ui/  shadcn
  lib/            supabase.ts, utils
  types/          database.ts (generado)
supabase/
  migrations/     una migración por cambio de esquema; nunca editar una ya aplicada
  functions/      create-client
  seed.sql
tests/            tests de RLS, client_periods y client_status (Vitest contra Supabase local)
```

## Seguridad (no negociable)
- Toda tabla nueva lleva RLS habilitado y políticas en la **misma migración**.
- Toda vista se crea con `security_invoker = true` y toda función que lea datos de clientes es `SECURITY INVOKER` (la única excepción es `is_admin()`).
- La autorización se resuelve en la base de datos. Ocultar algo en la UI no cuenta como seguridad.
- La service role key solo se usa en la Edge Function, nunca en `src/`.
- Cada política nueva lleva al menos un test que verifique que un cliente **no** puede ver datos de otro.
- Nunca hagas cambios de esquema desde el panel de Supabase; siempre con migraciones.

## Lógica de negocio
- Los períodos (inicio, fin, clases usadas) **no se guardan**: los calcula la función `client_periods` a partir de `payments` y `attendances`. No agregues columnas ni tablas de estado para esto.
- El estado de cuota y las clases restantes salen de la vista `client_status`; no se recalculan en el frontend.
- Cualquier cambio a la regla de períodos se hace en `client_periods` y se acompaña de un test nuevo.
