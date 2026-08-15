alter table public.vehicles
  add column if not exists insurance text,
  add column if not exists plan_parts_status text,
  add column if not exists plan_note text,
  add column if not exists overall_progress text,
  add column if not exists plan_completed boolean not null default false;
