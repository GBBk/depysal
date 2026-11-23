-- T18: correcciones de la revisión de seguridad.

-- M1. Un admin dado de baja (activo = false) deja de ser admin. Antes seguía teniendo acceso
-- total (políticas, assign_routine y la Edge Function dependen de is_admin()).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol = 'admin' and activo
  );
$$;

-- L1. Los planes los leen el admin y los clientes activos (antes: cualquier usuario logueado,
-- también un cliente dado de baja). Regla de CLAUDE.md: lecturas de clientes solo si activo.
drop policy "plans_select_authenticated" on public.plans;
create policy "plans_select_admin_or_active" on public.plans
  for select to authenticated
  using ((select public.is_admin()) or (select public.is_active_user()));

-- L2. payments.clases es la copia de las clases del plan al momento del pago y no se puede
-- tocar a mano: en un UPDATE se conserva el valor original, salvo que cambie el plan.
-- (Recalcularlo desde el plan actual cambiaría períodos ya pagados si el plan se editó.)
create or replace function public.copy_plan_clases()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.plan_id is not distinct from old.plan_id then
    new.clases := old.clases;
  else
    select p.clases into new.clases from public.plans p where p.id = new.plan_id;
  end if;
  return new;
end;
$$;

drop trigger payments_copy_plan_clases on public.payments;
create trigger payments_copy_plan_clases
  before insert or update on public.payments
  for each row execute function public.copy_plan_clases();

-- L3. Dos asistencias del mismo cliente registradas a la vez podían pasar las dos el control
-- de "Debe abonar" con 1 sola clase disponible. Se serializan por cliente con un lock de
-- transacción; el resto del control queda igual.
create or replace function public.check_attendance_allowed()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_periodo record;
begin
  perform pg_advisory_xact_lock(hashtext(new.client_id::text));

  select cp.clases_total, cp.clases_usadas into v_periodo
  from public.client_periods(new.client_id) cp
  where new.fecha between cp.desde and cp.hasta
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'debe_abonar',
      detail = 'El cliente no tiene un período vigente en esa fecha.';
  end if;

  if v_periodo.clases_total is null then
    raise exception using errcode = 'P0001', message = 'pase_libre',
      detail = 'El pase libre no necesita registrar asistencias.';
  end if;

  if v_periodo.clases_usadas >= v_periodo.clases_total then
    raise exception using errcode = 'P0001', message = 'debe_abonar',
      detail = 'El cliente ya usó todas las clases de su período.';
  end if;

  return new;
end;
$$;

-- I1. Las funciones nuevas no quedan ejecutables por anon/public por defecto: cada migración
-- tiene que dar EXECUTE explícito a quien corresponda (como ya hacen las existentes).
alter default privileges in schema public revoke execute on functions from public, anon;
