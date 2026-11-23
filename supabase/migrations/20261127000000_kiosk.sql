-- T18d: kiosco de asistencias (SPEC §2.4 y §4). La tablet de recepción entra con una cuenta
-- 'kiosk' que no lee ningún dato y solo registra la asistencia de hoy con kiosk_check_in(dni).

alter table public.profiles drop constraint profiles_rol_check;
alter table public.profiles add constraint profiles_rol_check
  check (rol in ('admin', 'client', 'kiosk'));

-- Las lecturas "de cliente activo" (planes, ejercicios y sus fotos) son solo para clientes:
-- antes alcanzaba con estar activo, y el kiosco también lo está. El admin no cambia: todas
-- esas políticas ya tienen su propio `is_admin()`.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol = 'client' and activo
  );
$$;

-- Registra la asistencia de hoy del cliente con ese DNI y devuelve qué pasó.
-- SECURITY DEFINER (excepción aprobada, ver CLAUDE.md): el kiosco no puede leer profiles,
-- client_status ni attendances, así que la función lo hace por él. Para que sea segura:
--   * solo la ejecuta un usuario 'kiosk' activo;
--   * la fecha es siempre hoy en Argentina (el kiosco no la elige);
--   * devuelve solo el resultado, el nombre de pila, clases restantes y vencimiento.
-- La regla "Debe abonar" la sigue validando el trigger check_attendance_allowed.
-- resultado: registrada | ya_registrada | debe_abonar | sin_clases_hoy | pase_libre
--            | no_encontrado | inactivo | dni_invalido
create function public.kiosk_check_in(p_dni text)
returns table (
  resultado text,
  nombre text,
  clases_restantes integer,
  hasta date,
  tiene_periodo_en_espera boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_dni text := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');
  v_client record;
  v_status record;
begin
  if not exists (
    select 1 from public.profiles k
    where k.id = (select auth.uid()) and k.rol = 'kiosk' and k.activo
  ) then
    raise exception using errcode = '42501', message = 'no_autorizado';
  end if;

  if v_dni !~ '^\d{7,8}$' then
    resultado := 'dni_invalido';
    return next;
    return;
  end if;

  select p.id, p.nombre, p.activo into v_client
  from public.profiles p
  where p.rol = 'client' and p.dni = v_dni;

  if not found then
    resultado := 'no_encontrado';
    return next;
    return;
  end if;
  if not v_client.activo then
    resultado := 'inactivo';
    return next;
    return;
  end if;

  nombre := v_client.nombre;

  select s.periodo_actual, s.clases_restantes, s.hasta, s.tiene_periodo_en_espera
  into v_status
  from public.client_status s
  where s.client_id = v_client.id;

  hasta := v_status.hasta;
  tiene_periodo_en_espera := v_status.tiene_periodo_en_espera;

  -- Primero "ya vino": si usó su última clase hoy, el estado diría "Debe abonar".
  if exists (
    select 1 from public.attendances a where a.client_id = v_client.id and a.fecha = v_hoy
  ) then
    resultado := 'ya_registrada';
    clases_restantes := v_status.clases_restantes;
    return next;
    return;
  end if;

  -- Mismo criterio que attendanceAvailability (src/features/attendances/availability.ts).
  if v_status.periodo_actual is not null and v_status.clases_restantes is null then
    resultado := 'pase_libre';
    return next;
    return;
  end if;
  if v_status.periodo_actual is null or v_status.clases_restantes <= 0 then
    resultado := case when v_status.tiene_periodo_en_espera
      then 'sin_clases_hoy' else 'debe_abonar' end;
    clases_restantes := 0;
    return next;
    return;
  end if;

  begin
    insert into public.attendances (client_id, fecha) values (v_client.id, v_hoy);
  exception
    when unique_violation then  -- la registraron recién desde otro lado
      resultado := 'ya_registrada';
      clases_restantes := v_status.clases_restantes;
      return next;
      return;
    when raise_exception then   -- trigger check_attendance_allowed
      if sqlerrm in ('debe_abonar', 'pase_libre') then
        resultado := sqlerrm;
        return next;
        return;
      end if;
      raise;
  end;

  resultado := 'registrada';
  clases_restantes := v_status.clases_restantes - 1;
  return next;
end;
$$;

revoke execute on function public.kiosk_check_in(text) from public, anon;
grant execute on function public.kiosk_check_in(text) to authenticated;
