-- T09: una asistencia solo se registra si el cliente tiene, en esa fecha, un período con
-- clases disponibles (SPEC §2.4). Se valida en la base para que valga para cualquier fecha
-- y cualquier cliente HTTP, no solo para la UI.
--   'debe_abonar': no hay período que cubra la fecha, o ya usó todas sus clases.
--   'pase_libre':  el período es de pase libre (no necesita registrar asistencias).
-- No cambia la regla de períodos: usa client_periods tal cual.

create function public.check_attendance_allowed()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_periodo record;
begin
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

create trigger attendances_check_allowed
  before insert on public.attendances
  for each row execute function public.check_attendance_allowed();
