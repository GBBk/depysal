-- T15: operaciones de rutinas que tocan varias filas y tienen que ser atómicas.
-- Las dos son SECURITY INVOKER: corren con los permisos de quien llama, así que el RLS
-- (solo el admin escribe rutinas e ítems) sigue mandando.

-- Guarda una rutina completa (nombre + todos sus ítems): reemplaza los ítems en una sola
-- transacción, para que nunca quede a medio guardar. p_items es un array de objetos
-- { dia, orden, exercise_id, series, reps, descanso_seg, notas }.
create function public.save_routine(p_routine_id bigint, p_nombre text, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.routines set nombre = p_nombre where id = p_routine_id;
  if not found then
    -- No existe o el RLS no deja modificarla (por ejemplo, la llama un cliente).
    raise exception using errcode = 'P0001', message = 'rutina_no_encontrada';
  end if;

  delete from public.routine_items where routine_id = p_routine_id;

  insert into public.routine_items
    (routine_id, dia, orden, exercise_id, series, reps, descanso_seg, notas)
  select p_routine_id, x.dia, x.orden, x.exercise_id, x.series, x.reps, x.descanso_seg,
         nullif(btrim(x.notas), '')
  from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as x(
    dia text, orden int, exercise_id bigint, series int, reps text, descanso_seg int, notas text
  );
end;
$$;

-- Asigna una rutina a un cliente: la que tenía activa pasa a inactiva y la nueva queda activa.
-- Con p_template_id copia los ítems de la plantilla (la copia es independiente: editarla no
-- cambia la plantilla). Sin plantilla, crea una rutina vacía "desde cero". Devuelve el id nuevo.
create function public.assign_routine(
  p_client_id uuid,
  p_template_id bigint default null,
  p_nombre text default null
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_nombre text := nullif(btrim(p_nombre), '');
  v_id bigint;
begin
  if not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'solo_admin';
  end if;

  if not exists (select 1 from public.profiles where id = p_client_id and rol = 'client') then
    raise exception using errcode = 'P0001', message = 'cliente_no_encontrado';
  end if;

  if p_template_id is not null then
    select coalesce(v_nombre, r.nombre) into v_nombre
    from public.routines r
    where r.id = p_template_id and r.es_plantilla;
    if not found then
      raise exception using errcode = 'P0001', message = 'plantilla_no_encontrada';
    end if;
  end if;

  update public.routines set activa = false where client_id = p_client_id and activa;

  insert into public.routines (nombre, es_plantilla, client_id, activa)
  values (coalesce(v_nombre, 'Rutina'), false, p_client_id, true)
  returning id into v_id;

  if p_template_id is not null then
    insert into public.routine_items
      (routine_id, dia, orden, exercise_id, series, reps, descanso_seg, notas)
    select v_id, i.dia, i.orden, i.exercise_id, i.series, i.reps, i.descanso_seg, i.notas
    from public.routine_items i
    where i.routine_id = p_template_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_routine(bigint, text, jsonb) from public, anon;
revoke execute on function public.assign_routine(uuid, bigint, text) from public, anon;
grant execute on function public.save_routine(bigint, text, jsonb) to authenticated, service_role;
grant execute on function public.assign_routine(uuid, bigint, text) to authenticated, service_role;
