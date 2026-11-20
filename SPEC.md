# Depysal — Especificación

App web de gestión para un gimnasio chico (< 120 clientes activos por mes).
Objetivo: lo mínimo y funcional para gestionar **clientes**, **pagos**, **asistencias** y **rutinas**.

## 1. Roles

| Rol | Quién | Puede |
|---|---|---|
| `admin` | Dueño / entrenador / recepción | Todo: clientes, planes, pagos, asistencias, ejercicios, rutinas |
| `client` | Socio del gimnasio | Ver su rutina activa, su estado de cuota y sus clases restantes |

- No hay registro público. Las cuentas de clientes las crea el admin con una contraseña inicial.
- Login con email + contraseña (Supabase Auth). El cliente puede cambiar su contraseña.
- Puede haber más de un admin.

## 2. Funcionalidades

### 2.1 Clientes (admin)
- Listado con búsqueda por nombre o DNI y filtro por estado de cuota.
- Alta: nombre, apellido, DNI, teléfono, email, notas (lesiones, observaciones).
- Edición y baja lógica (`activo = false`). Nunca se borran clientes.
- Ficha del cliente: datos, estado de cuota, período actual (plan, vigencia y clases restantes), historial de pagos, asistencias y rutina activa.

### 2.2 Planes (admin)
Tres planes, cargados en el seed y con precio editable:

| Plan | Clases por período | Duración máxima |
|---|---|---|
| 2 días por semana | 8 | 30 días |
| 3 días por semana | 12 | 30 días |
| Pase libre | ilimitadas (`clases = null`) | 30 días |

- El admin puede editar nombre, precio y cantidad de clases, y desactivar planes. Un plan con pagos asociados no se borra.

### 2.3 Pagos y períodos
Cada pago genera un **período** de uso del plan pagado.

- **Registrar un pago** (admin): cliente, plan, monto (por defecto el precio del plan, editable), medio (`efectivo` | `transferencia` | `otro`) y fecha de pago (por defecto hoy).
- **Inicio del período:**
  - Si el cliente no tiene un período vigente, empieza en la fecha de pago.
  - Si paga mientras tiene un período vigente, el nuevo período queda **en espera** y empieza el día siguiente a que termine el actual. **El cliente no pierde días ni clases.**
- **Fin del período:** termina en lo que ocurra primero:
  - pasan 30 días: el período cubre 30 días contando el de inicio, así que el último día válido es `desde + 29` (si paga el día 1, puede entrenar hasta el día 30);
  - se usa la última clase del plan (8.ª o 12.ª asistencia). Termina ese mismo día.
  - El pase libre solo termina por fecha.
- Las clases no usadas al terminar los 30 días se pierden.
- Ejemplos:
  - Paga el día 1 el plan de 8 clases y paga de nuevo el día 25 con clases sin usar: el nuevo período empieza el día 31 (al terminar los 30 días del actual).
  - Paga el día 1 el plan de 8 clases y usa la 8.ª clase el día 20. Si ya había pagado el siguiente, ese período empieza el día 21. Si no, queda vencido hasta que pague, y el nuevo período empieza en la fecha de ese pago.
- **Anular un pago** cargado por error (`anulado = true`). Los pagos anulados no generan período.
- Los períodos **no se guardan**: se calculan siempre a partir de los pagos y las asistencias con la función `client_periods` (ver §3). Así, anular un pago o una asistencia corrige todo automáticamente.

### 2.4 Asistencias (admin)
- Desde el panel o la ficha: buscar al cliente → **Registrar asistencia** (fecha por defecto hoy). Una asistencia como máximo por cliente y por día.
- Solo se registran para planes con clases (2 y 3 días por semana). El pase libre no necesita registrar asistencias.
- Antes de registrar se muestran las clases restantes. Si el cliente no tiene un período vigente con clases disponibles, se muestra el aviso "Debe abonar" y no se registra la asistencia.
- Anular una asistencia cargada por error (se borra).

### 2.5 Estado de cuota
Se calcula en la vista `client_status`, no se guarda:
- `al_dia`: tiene un período vigente que no está por vencer, **o** ya tiene el siguiente período pago en espera.
- `por_vencer`: el período vigente termina en 5 días o menos, **o** le quedan 2 clases o menos, y no tiene otro período en espera.
- `vencido`: no tiene un período vigente (sin pagos, venció por fecha o usó todas las clases).

### 2.6 Panel principal (admin)
- Buscador rápido de cliente con botón **Registrar asistencia**.
- Dos listas: **Vencidos** y **Por vencer**, más un contador de clientes al día.
- Ingresos del mes en curso (suma de pagos no anulados).
- En cada cliente vencido o por vencer: botón **WhatsApp** que abre `https://wa.me/<telefono>?text=<mensaje>` con un recordatorio ya escrito.

### 2.7 Ejercicios (admin)
- CRUD: nombre, grupo muscular (lista fija) y link a video opcional.

### 2.8 Rutinas (admin)
- Una rutina tiene nombre y días (A, B, C…). Cada día tiene una lista ordenada de ítems: ejercicio, series, repeticiones (texto libre, por ejemplo "10-12" o "al fallo"), descanso en segundos y notas.
- **Plantillas:** rutinas con `es_plantilla = true` y sin cliente.
- **Asignar a un cliente:** desde una plantilla (se crea una **copia**; editarla no modifica la plantilla) o desde cero.
- Cada cliente tiene como máximo **una rutina activa**. Al asignar una nueva, la anterior pasa a inactiva.

### 2.9 Vista del cliente (mobile-first, instalable como PWA)
- **Inicio:** estado de cuota (badge con color), plan actual, vigencia hasta, clases restantes (si el plan tiene clases) y, si existe, el próximo período en espera.
- **Mi rutina:** pestañas por día; cada ejercicio muestra series × reps, descanso, notas y el link al video.
- **Cambiar contraseña.**
- El cliente no puede editar nada más.
- Un cliente inactivo no puede usar la app: ve un mensaje para contactar al gimnasio.

## 3. Modelo de datos (Supabase / Postgres)

```
profiles         id (= auth.users.id), rol ('admin'|'client'), nombre, apellido, dni (único),
                 telefono, email, notas, activo, created_at
plans            id, nombre, precio, clases (int, null = ilimitadas), activo
payments         id, client_id → profiles, plan_id → plans, monto, medio, fecha_pago,
                 clases (copia de plans.clases al momento del pago), anulado, created_at
attendances      id, client_id → profiles, fecha, created_by, created_at
                 UNIQUE (client_id, fecha)
exercises        id, nombre, grupo_muscular, video_url
routines         id, nombre, es_plantilla, client_id → profiles (null si es plantilla),
                 activa, created_at
routine_items    id, routine_id → routines (cascade), dia ('A'..'F'), orden, exercise_id → exercises,
                 series, reps, descanso_seg, notas
```

`payments.clases` guarda una copia de las clases del plan para que, si el admin edita el plan después, los períodos ya pagados no cambien.

### Función `client_periods(p_client_id uuid)` (SQL/plpgsql, `SECURITY INVOKER`)
Devuelve los períodos del cliente, calculados en orden de `fecha_pago` (y `id` si hay empate):

```
payment_id, plan_nombre, desde, hasta, clases_total, clases_usadas, termino_por_clases

fin_anterior = null
por cada pago no anulado, en orden:
  desde      = fecha_pago                               si fin_anterior es null
             = greatest(fecha_pago, fin_anterior + 1)   si no
  hasta_max  = desde + 29        -- 30 días contando el de inicio
  si clases_total no es null:
    asistencias del período = las del cliente con fecha entre desde y hasta_max, en orden
    si hay >= clases_total: hasta = fecha de la asistencia n.º clases_total; termino_por_clases = true
    si no:                  hasta = hasta_max
    clases_usadas = asistencias con fecha entre desde y hasta
  si no:
    hasta = hasta_max; clases_usadas = null
  fin_anterior = hasta
```

### Vista `client_status` (`security_invoker = true`)
Una fila por cliente: `client_id`, `periodo_actual` (el que cubre hoy, si existe), `hasta`, `clases_restantes`, `tiene_periodo_en_espera` y `estado` según §2.5. Usa `client_periods`.

### Restricciones
- Índice único parcial: una sola rutina `activa = true` por `client_id`.
- `CHECK`: si `es_plantilla` entonces `client_id IS NULL`.
- `CHECK`: `plans.clases` y `payments.clases` son null o > 0.

## 4. Seguridad (RLS obligatorio en todas las tablas)
- Función `is_admin()` (security definer) basada en `profiles.rol`.
- `admin`: acceso total.
- `client`, solo lectura:
  - `profiles`: su propia fila.
  - `payments` y `attendances`: las propias (necesarias para calcular sus períodos).
  - `plans` y `exercises`: todos.
  - `routines` / `routine_items`: solo su rutina activa e ítems; nunca plantillas.
- `client_periods` es `SECURITY INVOKER` y `client_status` usa `security_invoker = true`: las dos respetan el RLS, así que un cliente solo puede calcular sus propios períodos.
- La creación de usuarios cliente se hace con una Edge Function que usa la service role key y verifica que quien llama sea admin. La service role key **nunca** va en el frontend.

## 5. Stack
- Vite + React + TypeScript (SPA)
- React Router (rutas protegidas por rol)
- Supabase (Postgres, Auth, RLS, una Edge Function), con tipos generados por `supabase gen types`
- TanStack Query
- react-hook-form + zod
- Tailwind CSS + shadcn/ui
- vite-plugin-pwa
- Vitest para los tests de RLS, de `client_periods` y de `client_status`
- Deploy: Vercel o Netlify para el frontend, Supabase Cloud (plan gratuito)

## 6. Fuera de alcance (no implementar sin pedido explícito)
- Pasarela de pagos (Mercado Pago, etc.)
- Facturación electrónica AFIP/ARCA
- Check-in hecho por el propio cliente (QR, molinetes, botón en la app)
- Límite de clases por semana (solo se controla el total del período)
- Métricas de progreso o gráficos
- Historial de rutinas visible para el cliente
- Reservas de turnos o clases con horario
- Nutrición o planes de dieta
- Chat o mensajería interna
- Notificaciones push o envío automático de mensajes
- Multi-gimnasio
- App nativa
