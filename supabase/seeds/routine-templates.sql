-- Plantillas de ejemplo (SPEC §2.8), armadas con la biblioteca de ejercicios.
-- Idempotente: si ya existe una plantilla con ese nombre, no la vuelve a crear ni la pisa.
-- Se carga después de seeds/exercises.sql (los ejercicios se buscan por origen_id).

create function pg_temp.seed_template(p_nombre text, p_items jsonb) returns void
language plpgsql
as $$
declare
  v_id bigint;
begin
  if exists (select 1 from public.routines where es_plantilla and nombre = p_nombre) then
    return;
  end if;

  insert into public.routines (nombre, es_plantilla) values (p_nombre, true) returning id into v_id;

  insert into public.routine_items (routine_id, dia, orden, exercise_id, series, reps, descanso_seg)
  select v_id, x.dia, x.orden, e.id, x.series, x.reps, x.descanso
  from jsonb_to_recordset(p_items) as x(dia text, orden int, ej text, series int, reps text, descanso int)
  join public.exercises e on e.origen_id = x.ej;
end;
$$;

select pg_temp.seed_template('Cuerpo completo 3 días', '[
  {"dia":"A","orden":0,"ej":"Barbell_Squat","series":4,"reps":"8-10","descanso":90},
  {"dia":"A","orden":1,"ej":"Barbell_Bench_Press_-_Medium_Grip","series":4,"reps":"8-10","descanso":90},
  {"dia":"A","orden":2,"ej":"Bent_Over_Barbell_Row","series":3,"reps":"10","descanso":75},
  {"dia":"A","orden":3,"ej":"Dumbbell_Shoulder_Press","series":3,"reps":"10-12","descanso":60},
  {"dia":"A","orden":4,"ej":"Plank","series":3,"reps":"30-45 s","descanso":45},
  {"dia":"B","orden":0,"ej":"Romanian_Deadlift","series":4,"reps":"8-10","descanso":90},
  {"dia":"B","orden":1,"ej":"Incline_Dumbbell_Press","series":3,"reps":"10-12","descanso":75},
  {"dia":"B","orden":2,"ej":"Wide-Grip_Lat_Pulldown","series":3,"reps":"10-12","descanso":75},
  {"dia":"B","orden":3,"ej":"Dumbbell_Lunges","series":3,"reps":"10 por pierna","descanso":60},
  {"dia":"B","orden":4,"ej":"Crunches","series":3,"reps":"15","descanso":45},
  {"dia":"C","orden":0,"ej":"Leg_Press","series":4,"reps":"10-12","descanso":90},
  {"dia":"C","orden":1,"ej":"Dumbbell_Bench_Press","series":3,"reps":"10-12","descanso":75},
  {"dia":"C","orden":2,"ej":"Seated_Cable_Rows","series":3,"reps":"10-12","descanso":75},
  {"dia":"C","orden":3,"ej":"Side_Lateral_Raise","series":3,"reps":"12-15","descanso":45},
  {"dia":"C","orden":4,"ej":"Barbell_Curl","series":3,"reps":"10-12","descanso":45},
  {"dia":"C","orden":5,"ej":"Triceps_Pushdown","series":3,"reps":"12","descanso":45}
]');

select pg_temp.seed_template('Torso / Pierna 4 días', '[
  {"dia":"A","orden":0,"ej":"Barbell_Bench_Press_-_Medium_Grip","series":4,"reps":"6-8","descanso":120},
  {"dia":"A","orden":1,"ej":"Bent_Over_Barbell_Row","series":4,"reps":"8","descanso":90},
  {"dia":"A","orden":2,"ej":"Standing_Military_Press","series":3,"reps":"8-10","descanso":90},
  {"dia":"A","orden":3,"ej":"Wide-Grip_Lat_Pulldown","series":3,"reps":"10","descanso":75},
  {"dia":"A","orden":4,"ej":"Dumbbell_Bicep_Curl","series":3,"reps":"12","descanso":45},
  {"dia":"A","orden":5,"ej":"Triceps_Pushdown_-_Rope_Attachment","series":3,"reps":"12","descanso":45},
  {"dia":"B","orden":0,"ej":"Barbell_Squat","series":4,"reps":"6-8","descanso":120},
  {"dia":"B","orden":1,"ej":"Romanian_Deadlift","series":3,"reps":"8-10","descanso":90},
  {"dia":"B","orden":2,"ej":"Leg_Press","series":3,"reps":"12","descanso":90},
  {"dia":"B","orden":3,"ej":"Lying_Leg_Curls","series":3,"reps":"12","descanso":60},
  {"dia":"B","orden":4,"ej":"Standing_Calf_Raises","series":4,"reps":"15","descanso":45},
  {"dia":"C","orden":0,"ej":"Incline_Dumbbell_Press","series":4,"reps":"10","descanso":90},
  {"dia":"C","orden":1,"ej":"One-Arm_Dumbbell_Row","series":4,"reps":"10","descanso":75},
  {"dia":"C","orden":2,"ej":"Arnold_Dumbbell_Press","series":3,"reps":"10-12","descanso":75},
  {"dia":"C","orden":3,"ej":"Cable_Crossover","series":3,"reps":"12-15","descanso":60},
  {"dia":"C","orden":4,"ej":"Hammer_Curls","series":3,"reps":"12","descanso":45},
  {"dia":"C","orden":5,"ej":"EZ-Bar_Skullcrusher","series":3,"reps":"10-12","descanso":45},
  {"dia":"D","orden":0,"ej":"Barbell_Hip_Thrust","series":4,"reps":"10","descanso":90},
  {"dia":"D","orden":1,"ej":"Dumbbell_Lunges","series":3,"reps":"10 por pierna","descanso":75},
  {"dia":"D","orden":2,"ej":"Leg_Extensions","series":3,"reps":"12-15","descanso":60},
  {"dia":"D","orden":3,"ej":"Seated_Leg_Curl","series":3,"reps":"12-15","descanso":60},
  {"dia":"D","orden":4,"ej":"Seated_Calf_Raise","series":4,"reps":"15","descanso":45},
  {"dia":"D","orden":5,"ej":"Hanging_Leg_Raise","series":3,"reps":"10-12","descanso":45}
]');

select pg_temp.seed_template('Empuje / Tirón / Pierna', '[
  {"dia":"A","orden":0,"ej":"Barbell_Bench_Press_-_Medium_Grip","series":4,"reps":"8","descanso":90},
  {"dia":"A","orden":1,"ej":"Incline_Dumbbell_Press","series":3,"reps":"10","descanso":75},
  {"dia":"A","orden":2,"ej":"Dumbbell_Shoulder_Press","series":3,"reps":"10","descanso":75},
  {"dia":"A","orden":3,"ej":"Side_Lateral_Raise","series":3,"reps":"15","descanso":45},
  {"dia":"A","orden":4,"ej":"Triceps_Pushdown","series":3,"reps":"12","descanso":45},
  {"dia":"A","orden":5,"ej":"Standing_Dumbbell_Triceps_Extension","series":3,"reps":"12","descanso":45},
  {"dia":"B","orden":0,"ej":"Pullups","series":4,"reps":"al fallo","descanso":90},
  {"dia":"B","orden":1,"ej":"Bent_Over_Barbell_Row","series":4,"reps":"8","descanso":90},
  {"dia":"B","orden":2,"ej":"Seated_Cable_Rows","series":3,"reps":"10","descanso":75},
  {"dia":"B","orden":3,"ej":"Face_Pull","series":3,"reps":"15","descanso":45},
  {"dia":"B","orden":4,"ej":"Barbell_Curl","series":3,"reps":"10","descanso":45},
  {"dia":"B","orden":5,"ej":"Hammer_Curls","series":3,"reps":"12","descanso":45},
  {"dia":"C","orden":0,"ej":"Barbell_Squat","series":4,"reps":"8","descanso":120},
  {"dia":"C","orden":1,"ej":"Romanian_Deadlift","series":3,"reps":"10","descanso":90},
  {"dia":"C","orden":2,"ej":"Leg_Press","series":3,"reps":"12","descanso":90},
  {"dia":"C","orden":3,"ej":"Lying_Leg_Curls","series":3,"reps":"12","descanso":60},
  {"dia":"C","orden":4,"ej":"Standing_Calf_Raises","series":4,"reps":"15","descanso":45},
  {"dia":"C","orden":5,"ej":"Plank","series":3,"reps":"45 s","descanso":45}
]');
