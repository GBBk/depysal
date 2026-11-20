-- Seed SOLO para desarrollo local (`supabase db reset`). Nunca se corre en producción.
--
-- Usuarios (contraseñas de prueba, solo locales):
--   admin@depysal.test      / admin1234   (rol admin)
--   <nombre>.<apellido>@depysal.test / cliente1234   (20 clientes; 2 inactivos)
--
-- Los ejercicios se agregan en T12, cuando exista la tabla exercises.

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
    'admin@depysal.test', 'admin1234',
    '{"nombre": "Admin", "apellido": "Depysal"}'
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
      lower(translate(c.nombre || '.' || c.apellido, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) || '@depysal.test',
      'cliente1234',
      jsonb_build_object('nombre', c.nombre, 'apellido', c.apellido, 'dni', c.dni, 'telefono', c.telefono)
    );
    update public.profiles set notas = c.notas, activo = c.activo where id = v_id;
  end loop;
end;
$$;
