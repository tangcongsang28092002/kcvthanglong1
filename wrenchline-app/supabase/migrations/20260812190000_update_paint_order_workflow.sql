alter table public.paint_orders
  add column if not exists priority text default 'sequential',
  add column if not exists time_in_workshop timestamptz,
  add column if not exists time_out_workshop timestamptz;

update public.paint_orders
set
  priority = coalesce(priority, 'sequential'),
  status = case status
    when 'pending' then 'waiting'
    when 'in_progress' then 'painting'
    when 'completed' then 'done'
    else coalesce(status, 'waiting')
  end,
  time_in_workshop = coalesce(time_in_workshop, started_at),
  time_out_workshop = coalesce(time_out_workshop, completed_at);

alter table public.paint_orders
  alter column priority set default 'sequential';
