# Tareas

Reglas: una tarea por vez, en orden. Cada tarea va en su propio commit. Una tarea está terminada solo cuando se cumple su criterio de **Terminado** y pasan `npm run typecheck`, `npm run lint` y `npm test`.

## Etapa 0 — Base
- [x] **T01 Scaffold**: Vite + React + TS, Tailwind, shadcn/ui, React Router, TanStack Query, ESLint + Prettier, Vitest, `supabase init`, cliente en `src/lib/supabase.ts`, `.env.example`.
  - Terminado: `npm run build` pasa y la app se conecta a Supabase local; `.env` está en `.gitignore`.

## Etapa 1 — Auth y clientes
- [x] **T02 Migración: profiles + `is_admin()` + RLS**, con trigger que crea el profile al crear el usuario.
  - Terminado: test donde un cliente lee su propio profile y no el de otro.
- [x] **T03 Login, logout y rutas por rol**: `/admin/*` solo para admin y `/app/*` solo para client; un cliente inactivo es bloqueado.
  - Terminado: cada rol termina en su sección y no puede entrar a la otra.
- [x] **T04 Clientes**: Edge Function `create-client` (403 si no la llama un admin) y pantallas de listado, búsqueda, alta, edición y baja lógica.
  - Terminado: flujo completo desde la UI; validaciones zod (DNI único, email válido).
- [x] **T05 Seed** (`supabase/seed.sql`): 1 admin y unos 20 clientes. (Los ejercicios básicos pasaron a T12, cuando se crea la tabla.)
  - Terminado: `supabase db reset` deja la app lista para probar.

## Etapa 2 — Pagos y asistencias (primera entrega al dueño)
- [x] **T06 Migración: plans, payments, attendances + RLS**. Seed con los 3 planes (8 clases, 12 clases, pase libre).
  - Terminado: test donde un cliente no ve pagos ni asistencias de otro.
- [x] **T07 Función `client_periods` y vista `client_status`** según SPEC §3. Agregar al seed pagos y asistencias que dejen clientes en los tres estados.
  - Terminado: tests de, como mínimo:
    - primer pago: el período empieza en la fecha de pago y vence a los 30 días;
    - pago anticipado: el nuevo período empieza el día siguiente al fin del actual (no se pierden días);
    - plan de 8 clases que termina por clases antes de los 30 días, con y sin período en espera;
    - pago después de vencido: empieza en la fecha de pago;
    - pase libre: ignora las asistencias;
    - pago anulado y asistencia anulada recalculan todo;
    - clases no usadas se pierden a los 30 días;
    - estados `al_dia`, `por_vencer` (por fecha y por clases) y `vencido`;
    - un cliente no puede calcular los períodos de otro.
- [x] **T08 Planes y pagos (UI)**: editar planes; registrar y anular pagos; ficha del cliente con período actual, períodos en espera e historial.
- [x] **T09 Asistencias (UI)**: registrar y anular desde la ficha y desde el buscador del panel; muestra clases restantes; bloquea con "Debe abonar".
- [x] **T10 Panel principal**: buscador con asistencia rápida, vencidos, por vencer, contador de al día, ingresos del mes y botón WhatsApp.
  - Terminado: los números coinciden con el seed.
- [x] **T11 Deploy de demo** (Supabase Cloud + Vercel/Netlify) para mostrarle al dueño.

- [x] **T11b Identidad visual** (pedido del usuario): colores del gimnasio (gris claro, naranja y negro), marca "Deporte y Salud", navegación lateral en escritorio y pestañas en celular, pantallas pulidas.

## Etapa 3 — Rutinas
- [x] **T12 Migración: exercises, routines, routine_items, routine_completions + RLS + índice de una rutina activa por cliente + bucket `exercise-images` con sus políticas** (SPEC §2.7, §2.8, §2.8.1, §3 y §4). Aplicarla también en la nube de la demo.
  - Terminado: tests de que un cliente ve solo su rutina activa y nunca plantillas; solo marca y borra días hechos propios y de su rutina activa; no ve rutinas ni marcas de otro; un cliente inactivo no ve nada; un ejercicio usado en una rutina no se borra.
- [x] **T13 Biblioteca de ejercicios**: lista curada de unos 150 ejercicios de free-exercise-db (peso libre, máquinas, poleas y peso corporal), traducida al español, y un script de importación que sube las fotos a Storage. Corre en local (seed) y en la nube.
  - Terminado: correr el script dos veces no duplica nada; cada ejercicio tiene nombre, grupo muscular, equipo e instrucciones en español y sus fotos.
- [x] **T14 Ejercicios (UI)**: listado con búsqueda y filtros (grupo, equipo) y fotos; alta y edición con subida o reemplazo de fotos y link a video; borrar solo si no está en uso.
- [x] **T15 Editor de rutinas y asignación**: crear, editar y eliminar rutinas y plantillas; días, ítems, reordenar; asignar una plantilla (copia) o una rutina desde cero; la anterior queda inactiva. Agregar al seed las 3 plantillas de ejemplo. En la ficha del cliente: su rutina activa y la última vez que hizo cada día.
  - Terminado: editar la copia no cambia la plantilla.

## Etapa 4 — Vista del cliente
- [x] **T16 Cliente**: inicio con estado, plan, vigencia, clases restantes y período en espera; mi rutina con pestañas por día, fotos, instrucciones y video; marcar un día como hecho (y borrar la marca); cambiar contraseña.
- [ ] **T17 PWA**: manifest e íconos; instalable en Android e iOS.

## Etapa 5 — Cierre
- [ ] **T18 Revisión de seguridad**: un agente nuevo revisa todas las políticas RLS (incluido Storage), `client_periods`, `client_status`, el trigger de asistencias y la Edge Function contra SPEC §4.
- [ ] **T19 Deploy de producción** y alta del admin real.
