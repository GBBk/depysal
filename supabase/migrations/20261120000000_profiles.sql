-- T02: profiles + is_admin() + RLS + trigger que crea el profile al crear el usuario.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol text not null default 'client' check (rol in ('admin', 'client')),
  nombre text not null default '',
  apellido text not null default '',
  dni text unique,
  telefono text,
  email text,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER para que las políticas puedan consultar profiles sin recursión de RLS.
-- Es la única función security definer que lee datos de clientes (ver CLAUDE.md).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Cliente: solo lectura de su propia fila. Admin: lee y edita todas.
-- No hay política de delete: los clientes nunca se borran (baja lógica con activo = false).
-- Los inserts los hace el trigger handle_new_user.
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Crea el profile al crear el usuario en auth.users. Siempre con rol 'client': el rol nunca
-- sale de los metadatos del usuario. Un admin se crea actualizando profiles.rol (seed o
-- service role) o lo promueve otro admin.
-- Es security definer porque corre como el rol de Auth, que no tiene permisos sobre public.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre, apellido, dni, telefono, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', ''),
    nullif(new.raw_user_meta_data ->> 'dni', ''),
    nullif(new.raw_user_meta_data ->> 'telefono', ''),
    new.email
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
