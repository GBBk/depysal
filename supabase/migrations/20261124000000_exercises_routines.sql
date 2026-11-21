-- T12: ejercicios, rutinas, ítems, días hechos y fotos de ejercicios (SPEC §2.7, §2.8, §2.8.1, §3, §4).

-- Cliente logueado y activo. SECURITY INVOKER: lee solo su propia fila de profiles (RLS).
create function public.is_active_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and activo
  );
$$;

revoke execute on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated, service_role;

-- Ejercicios ----------------------------------------------------------------------------------

create table public.exercises (
  id bigint generated always as identity primary key,
  nombre text not null check (btrim(nombre) <> ''),
  grupo_muscular text not null check (grupo_muscular in (
    'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazos', 'Cuádriceps',
    'Isquiotibiales', 'Glúteos', 'Pantorrillas', 'Abdominales', 'Cuerpo completo'
  )),
  equipo text not null check (equipo in (
    'Barra', 'Mancuernas', 'Máquina', 'Polea', 'Peso corporal', 'Otro'
  )),
  instrucciones text not null default '',
  -- Rutas dentro del bucket exercise-images (0 a 2: posición inicial y final).
  imagenes text[] not null default '{}' check (cardinality(imagenes) <= 2),
  video_url text,
  origen text not null default 'propio' check (origen in ('importado', 'propio')),
  origen_id text unique, -- id en free-exercise-db (solo importados)
  created_at timestamptz not null default now()
);

-- Rutinas -------------------------------------------------------------------------------------

create table public.routines (
  id bigint generated always as identity primary key,
  nombre text not null check (btrim(nombre) <> ''),
  es_plantilla boolean not null default false,
  client_id uuid references public.profiles (id),
  activa boolean not null default false,
  created_at timestamptz not null default now(),
  -- Plantilla <=> sin cliente; una plantilla nunca está activa.
  check (es_plantilla = (client_id is null)),
  check (not (es_plantilla and activa))
);

-- Como máximo una rutina activa por cliente.
create unique index routines_one_active_per_client
  on public.routines (client_id) where activa;

create table public.routine_items (
  id bigint generated always as identity primary key,
  routine_id bigint not null references public.routines (id) on delete cascade,
  dia text not null check (dia in ('A', 'B', 'C', 'D', 'E', 'F')),
  orden int not null check (orden >= 0),
  exercise_id bigint not null references public.exercises (id), -- un ejercicio en uso no se borra
  series int not null check (series > 0),
  reps text not null check (btrim(reps) <> ''), -- texto libre: "10-12", "al fallo"
  descanso_seg int check (descanso_seg is null or descanso_seg >= 0),
  notas text
);

create index routine_items_routine_id_idx on public.routine_items (routine_id, dia, orden);

-- Días hechos: "Hoy hice el Día A". No es una asistencia.
create table public.routine_completions (
  id bigint generated always as identity primary key,
  routine_id bigint not null references public.routines (id) on delete cascade,
  -- El default solo lo vuelve opcional en los inserts: el trigger lo pisa con el dueño de la rutina.
  client_id uuid not null default auth.uid() references public.profiles (id),
  dia text not null check (dia in ('A', 'B', 'C', 'D', 'E', 'F')),
  fecha date not null, -- sin default: el frontend manda la fecha de Argentina
  created_at timestamptz not null default now(),
  unique (routine_id, dia, fecha)
);

create index routine_completions_client_id_idx on public.routine_completions (client_id);

-- client_id siempre es el dueño de la rutina (lo que mande el cliente HTTP se ignora).
-- Una plantilla no tiene dueño: client_id queda null y el insert falla.
create function public.set_completion_client()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select r.client_id into new.client_id from public.routines r where r.id = new.routine_id;
  return new;
end;
$$;

create trigger routine_completions_set_client
  before insert or update of routine_id on public.routine_completions
  for each row execute function public.set_completion_client();

-- RLS -----------------------------------------------------------------------------------------

alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.routine_completions enable row level security;

-- exercises: los leen el admin y los clientes activos; solo el admin los modifica.
create policy "exercises_select_admin_or_active" on public.exercises
  for select to authenticated
  using ((select public.is_admin()) or (select public.is_active_user()));

create policy "exercises_insert_admin" on public.exercises
  for insert to authenticated with check ((select public.is_admin()));

create policy "exercises_update_admin" on public.exercises
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "exercises_delete_admin" on public.exercises
  for delete to authenticated using ((select public.is_admin()));

-- routines: el cliente activo ve solo su rutina activa (nunca plantillas); el admin, todo.
create policy "routines_select_own_active_or_admin" on public.routines
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      client_id = (select auth.uid())
      and activa
      and (select public.is_active_user())
    )
  );

create policy "routines_insert_admin" on public.routines
  for insert to authenticated with check ((select public.is_admin()));

create policy "routines_update_admin" on public.routines
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "routines_delete_admin" on public.routines
  for delete to authenticated using ((select public.is_admin()));

-- routine_items: los de una rutina que el usuario puede ver (la subconsulta respeta el RLS
-- de routines, así que un cliente solo ve los ítems de su rutina activa).
create policy "routine_items_select_visible_routine" on public.routine_items
  for select to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id));

create policy "routine_items_insert_admin" on public.routine_items
  for insert to authenticated with check ((select public.is_admin()));

create policy "routine_items_update_admin" on public.routine_items
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "routine_items_delete_admin" on public.routine_items
  for delete to authenticated using ((select public.is_admin()));

-- routine_completions: el cliente activo lee, marca y borra solo las suyas y solo de su
-- rutina activa, y solo para un día que la rutina tiene. El admin ve y borra todas.
create policy "routine_completions_select_own_or_admin" on public.routine_completions
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      client_id = (select auth.uid())
      and exists (select 1 from public.routines r where r.id = routine_id)
    )
  );

create policy "routine_completions_insert_own_active" on public.routine_completions
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.routine_items i
      where i.routine_id = routine_completions.routine_id and i.dia = routine_completions.dia
    )
  );

create policy "routine_completions_delete_own_or_admin" on public.routine_completions
  for delete to authenticated
  using (
    (select public.is_admin())
    or (
      client_id = (select auth.uid())
      and exists (select 1 from public.routines r where r.id = routine_id)
    )
  );

-- Fotos de ejercicios -------------------------------------------------------------------------
-- Bucket privado: las leen usuarios logueados (admin o cliente activo) con URLs firmadas;
-- solo el admin sube, reemplaza o borra.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-images', 'exercise-images', false, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "exercise_images_select_admin_or_active" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exercise-images'
    and ((select public.is_admin()) or (select public.is_active_user()))
  );

create policy "exercise_images_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exercise-images' and (select public.is_admin()));

create policy "exercise_images_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-images' and (select public.is_admin()))
  with check (bucket_id = 'exercise-images' and (select public.is_admin()));

create policy "exercise_images_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exercise-images' and (select public.is_admin()));
