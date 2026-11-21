-- Seed SOLO para desarrollo local (`supabase db reset`). Nunca se corre en producción.
--
-- Usuarios (contraseñas de prueba, solo locales):
--   admin@deporteysalud.test      / admin1234   (rol admin)
--   <nombre>.<apellido>@deporteysalud.test / cliente1234   (20 clientes; 2 inactivos)
--
-- Los ejercicios se importan en T13 (biblioteca curada de free-exercise-db).

-- Planes (SPEC §2.2). Precios de ejemplo: el admin los edita desde la app.
insert into public.plans (nombre, precio, clases) values
  ('2 días por semana', 25000, 8),
  ('3 días por semana', 32000, 12),
  ('Pase libre', 40000, null);

-- Crea un usuario de Auth con email y contraseña. El trigger handle_new_user crea su profile.
create function pg_temp.seed_user(
  p_email text,
  p_password text,
  p_meta jsonb
) returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', p_meta, now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
    now(), now(), now()
  );

  return v_id;
end;
$$;

-- Admin
do $$
declare
  v_id uuid;
begin
  v_id := pg_temp.seed_user(
    'admin@deporteysalud.test', 'admin1234',
    '{"nombre": "Admin", "apellido": "Gimnasio"}'
  );
  update public.profiles set rol = 'admin' where id = v_id;
end;
$$;

-- Clientes: nombre, apellido, dni, telefono, notas, activo
do $$
declare
  c record;
  v_id uuid;
begin
  for c in
    select * from (values
      ('Ana',       'Pérez',     '30111222', '3415550101', 'Lesión de rodilla derecha',   true),
      ('José',      'Gómez',     '28999000', '3415550102', null,                          true),
      ('Lucía',     'Fernández', '40123456', '3415550103', null,                          true),
      ('Martín',    'López',     '35222333', '3415550104', 'Hernia de disco: evitar peso muerto', true),
      ('Sofía',     'Martínez',  '42333444', '3415550105', null,                          true),
      ('Diego',     'Rodríguez', '31444555', '3415550106', null,                          true),
      ('Valentina', 'García',    '43555666', '3415550107', 'Asma leve',                   true),
      ('Matías',    'Sánchez',   '38666777', '3415550108', null,                          true),
      ('Camila',    'Romero',    '41777888', '3415550109', null,                          true),
      ('Nicolás',   'Díaz',      '36888999', '3415550110', 'Tendinitis en hombro izquierdo', true),
      ('Florencia', 'Torres',    '39100200', '3415550111', null,                          true),
      ('Facundo',   'Álvarez',   '37200300', '3415550112', null,                          true),
      ('Agustina',  'Ruiz',      '44300400', '3415550113', null,                          true),
      ('Lautaro',   'Ramírez',   '45400500', '3415550114', null,                          true),
      ('Micaela',   'Flores',    '40500600', '3415550115', 'Embarazo: rutina adaptada',   true),
      ('Joaquín',   'Acosta',    '33600700', '3415550116', null,                          true),
      ('Julieta',   'Benítez',   '42700800', '3415550117', null,                          true),
      ('Tomás',     'Medina',    '46800900', '3415550118', null,                          true),
      ('Carla',     'Herrera',   '34900100', '3415550119', null,                          false),
      ('Gonzalo',   'Suárez',    '29000111', '3415550120', 'Dejó en marzo',               false)
    ) as t(nombre, apellido, dni, telefono, notas, activo)
  loop
    v_id := pg_temp.seed_user(
      lower(translate(c.nombre || '.' || c.apellido, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) || '@deporteysalud.test',
      'cliente1234',
      jsonb_build_object('nombre', c.nombre, 'apellido', c.apellido, 'dni', c.dni, 'telefono', c.telefono)
    );
    update public.profiles set notas = c.notas, activo = c.activo where id = v_id;
  end loop;
end;
$$;

-- Pagos y asistencias, relativos a "hoy" (Argentina) para que el seed siempre deje clientes
-- en los tres estados. Resultado esperado en client_status (clientes activos):
--   al_dia (10):     Ana, José, Lucía, Sofía, Diego, Valentina, Matías (con período en espera),
--                    Camila, Julieta, Tomás
--   por_vencer (3):  Martín (por fecha), Nicolás (por fecha), Florencia (por clases: le quedan 2)
--   vencido (5):     Facundo y Agustina (por fecha), Lautaro (usó las 8 clases),
--                    Micaela (sin pagos), Joaquín (su único pago está anulado)
-- Inactivos: Carla (pagó hace meses) y Gonzalo (sin pagos), los dos vencidos.

-- Registra un pago hecho hace p_hace días y p_asistencias asistencias desde ese día, una cada 2 días.
create function pg_temp.seed_payment(
  p_email text,
  p_plan text,
  p_hace int,
  p_asistencias int,
  p_medio text default 'efectivo',
  p_anulado boolean default false
) returns void
language plpgsql
as $$
declare
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_client uuid;
  v_plan record;
  v_fecha date := v_hoy - p_hace;
begin
  select id into strict v_client from public.profiles where email = p_email;
  select id, precio into strict v_plan from public.plans where nombre = p_plan;

  insert into public.payments (client_id, plan_id, monto, medio, fecha_pago, anulado)
  values (v_client, v_plan.id, v_plan.precio, p_medio, v_fecha, p_anulado);

  insert into public.attendances (client_id, fecha)
  select v_client, v_fecha + i * 2 from generate_series(0, p_asistencias - 1) as i;
end;
$$;

select pg_temp.seed_payment('ana.perez@deporteysalud.test',          '2 días por semana', 10, 3);
select pg_temp.seed_payment('jose.gomez@deporteysalud.test',         'Pase libre',         3, 0, 'transferencia');
select pg_temp.seed_payment('lucia.fernandez@deporteysalud.test',    '3 días por semana', 15, 5);
select pg_temp.seed_payment('sofia.martinez@deporteysalud.test',     '2 días por semana',  5, 2, 'transferencia');
select pg_temp.seed_payment('diego.rodriguez@deporteysalud.test',    '3 días por semana',  8, 4);
select pg_temp.seed_payment('valentina.garcia@deporteysalud.test',   'Pase libre',        12, 0);
select pg_temp.seed_payment('matias.sanchez@deporteysalud.test',     '2 días por semana', 27, 3);
select pg_temp.seed_payment('matias.sanchez@deporteysalud.test',     '2 días por semana',  2, 0, 'transferencia');
select pg_temp.seed_payment('camila.romero@deporteysalud.test',      '3 días por semana',  1, 1);
select pg_temp.seed_payment('julieta.benitez@deporteysalud.test',    '3 días por semana', 20, 6, 'otro');
select pg_temp.seed_payment('tomas.medina@deporteysalud.test',       '2 días por semana',  6, 1);
select pg_temp.seed_payment('martin.lopez@deporteysalud.test',       'Pase libre',        26, 0);
select pg_temp.seed_payment('nicolas.diaz@deporteysalud.test',       '2 días por semana', 27, 2);
select pg_temp.seed_payment('florencia.torres@deporteysalud.test',   '2 días por semana', 12, 6);
select pg_temp.seed_payment('facundo.alvarez@deporteysalud.test',    '3 días por semana', 40, 5);
select pg_temp.seed_payment('agustina.ruiz@deporteysalud.test',      'Pase libre',        35, 0);
select pg_temp.seed_payment('lautaro.ramirez@deporteysalud.test',    '2 días por semana', 20, 8);
select pg_temp.seed_payment('joaquin.acosta@deporteysalud.test',     '2 días por semana',  4, 0, 'efectivo', true);
select pg_temp.seed_payment('carla.herrera@deporteysalud.test',      '2 días por semana', 120, 4);
