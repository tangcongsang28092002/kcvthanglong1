-- Fields captured from the workshop Excel repair-request form.
alter table public.vehicles
  add column if not exists vehicle_type text;

alter table public.tasks
  add column if not exists work_code text;
