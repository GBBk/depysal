-- T07: función client_periods y vista client_status (SPEC §2.3, §2.5 y §3).
-- Los períodos no se guardan: se calculan siempre desde payments y attendances.

-- SECURITY INVOKER: respeta el RLS, así que un cliente solo ve (y calcula) sus propios
-- pagos y asistencias. Para otro cliente devuelve cero filas.
create function public.client_periods(p_client_id uuid)
returns table (
  payment_id bigint,
  plan_nombre text,
  desde date,
  hasta date,
  clases_total int,
  clases_usadas int,
  termino_por_clases boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  r record;
  v_fin_anterior date := null;
  v_hasta_max date;
  v_ultima_clase date;
begin
  for r in
    select pa.id, pl.nombre, pa.fecha_pago, pa.clases
    from public.payments pa
    join public.plans pl on pl.id = pa.plan_id
    where pa.client_id = p_client_id and not pa.anulado
    order by pa.fecha_pago, pa.id
  loop
    payment_id := r.id;
    plan_nombre := r.nombre;
    clases_total := r.clases;

    -- Sin período anterior empieza el día del pago; si no, el día siguiente al fin del
    -- anterior (o el día del pago, si es posterior). Así no se pierden días ni clases.
    desde := case
      when v_fin_anterior is null then r.fecha_pago
      else greatest(r.fecha_pago, v_fin_anterior + 1)
    end;
    v_hasta_max := desde + 29; -- 30 días contando el de inicio

    if r.clases is null then
      -- Pase libre: solo termina por fecha y no cuenta asistencias.
      hasta := v_hasta_max;
      clases_usadas := null;
      termino_por_clases := false;
    else
      -- Fecha de la asistencia n.º clases_total dentro de la ventana de 30 días (si existe).
      select a.fecha into v_ultima_clase
      from public.attendances a
      where a.client_id = p_client_id and a.fecha between desde and v_hasta_max
      order by a.fecha
      offset r.clases - 1
      limit 1;

      if v_ultima_clase is not null then
        hasta := v_ultima_clase;
        termino_por_clases := true;
      else
        hasta := v_hasta_max;
        termino_por_clases := false;
      end if;

      select count(*)::int into clases_usadas
      from public.attendances a
      where a.client_id = p_client_id and a.fecha between desde and hasta;
    end if;

    v_fin_anterior := hasta;
    return next;
  end loop;
end;
$$;

revoke execute on function public.client_periods(uuid) from public, anon;
grant execute on function public.client_periods(uuid) to authenticated, service_role;

-- Una fila por cliente con su estado de cuota. "Hoy" es la fecha de Argentina, no la UTC.
--   periodo_actual: payment_id del período que cubre hoy (si existe).
--   vigente: cubre hoy y le quedan clases (o es pase libre).
--   estado (§2.5): al_dia si tiene un período en espera; si no, vencido sin período vigente;
--   por_vencer si el vigente termina en <= 5 días o le quedan <= 2 clases; si no, al_dia.
create view public.client_status
with (security_invoker = true)
as
with hoy as (
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date as d
)
select
  p.id as client_id,
  cur.payment_id as periodo_actual,
  cur.plan_nombre,
  cur.desde,
  cur.hasta,
  cur.clases_total - cur.clases_usadas as clases_restantes,
  espera.existe as tiene_periodo_en_espera,
  case
    when espera.existe then 'al_dia'
    when cur.payment_id is null
      or (cur.clases_total is not null and cur.clases_usadas >= cur.clases_total)
      then 'vencido'
    when cur.hasta - hoy.d <= 5
      or (cur.clases_total is not null and cur.clases_total - cur.clases_usadas <= 2)
      then 'por_vencer'
    else 'al_dia'
  end as estado
from public.profiles p
cross join hoy
left join lateral (
  select cp.*
  from public.client_periods(p.id) cp
  where cp.desde <= hoy.d and cp.hasta >= hoy.d
  limit 1
) cur on true
cross join lateral (
  select exists (
    select 1 from public.client_periods(p.id) cp where cp.desde > hoy.d
  ) as existe
) espera
where p.rol = 'client';

revoke all on public.client_status from anon;
