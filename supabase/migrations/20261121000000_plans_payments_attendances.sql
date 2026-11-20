-- T06: plans, payments, attendances + RLS.

create table public.plans (
  id bigint generated always as identity primary key,
  nombre text not null,
  precio numeric(12, 2) not null check (precio >= 0),
  clases int check (clases is null or clases > 0), -- null = ilimitadas (pase libre)
  activo boolean not null default true
);

-- Fechas de negocio sin default: el frontend manda la fecha local (Argentina). current_date
-- en la base es UTC y de noche daría el día siguiente.
create table public.payments (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.profiles (id),
  plan_id bigint not null references public.plans (id), -- un plan con pagos no se borra
  monto numeric(12, 2) not null check (monto >= 0),
  medio text not null check (medio in ('efectivo', 'transferencia', 'otro')),
  fecha_pago date not null,
  clases int check (clases is null or clases > 0), -- copia de plans.clases (trigger)
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

create index payments_client_id_idx on public.payments (client_id);

create table public.attendances (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.profiles (id),
  fecha date not null,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (client_id, fecha)
);

-- payments.clases siempre es la copia de plans.clases al momento del pago: se ignora lo que
-- mande el cliente HTTP. Así, si el admin edita el plan después, los períodos pagados no cambian.
create function public.copy_plan_clases()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select p.clases into new.clases from public.plans p where p.id = new.plan_id;
  return new;
end;
$$;

create trigger payments_copy_plan_clases
  before insert or update of plan_id on public.payments
  for each row execute function public.copy_plan_clases();

-- RLS ----------------------------------------------------------------------------------------

alter table public.plans enable row level security;
alter table public.payments enable row level security;
alter table public.attendances enable row level security;

-- plans: todos los usuarios logueados los leen; solo el admin los modifica.
create policy "plans_select_authenticated" on public.plans
  for select to authenticated using (true);

create policy "plans_insert_admin" on public.plans
  for insert to authenticated with check ((select public.is_admin()));

create policy "plans_update_admin" on public.plans
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "plans_delete_admin" on public.plans
  for delete to authenticated using ((select public.is_admin()));

-- payments: el cliente activo lee los propios; el admin lee, carga y anula.
-- Sin política de delete: los pagos no se borran, se anulan (anulado = true).
create policy "payments_select_own_active_or_admin" on public.payments
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      client_id = (select auth.uid())
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.activo)
    )
  );

create policy "payments_insert_admin" on public.payments
  for insert to authenticated with check ((select public.is_admin()));

create policy "payments_update_admin" on public.payments
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- attendances: el cliente activo lee las propias; el admin lee, registra y anula (borra).
create policy "attendances_select_own_active_or_admin" on public.attendances
  for select to authenticated
  using (
    (select public.is_admin())
    or (
      client_id = (select auth.uid())
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.activo)
    )
  );

create policy "attendances_insert_admin" on public.attendances
  for insert to authenticated with check ((select public.is_admin()));

create policy "attendances_delete_admin" on public.attendances
  for delete to authenticated using ((select public.is_admin()));
