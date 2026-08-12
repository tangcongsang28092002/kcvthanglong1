-- Enable realtime events for every table consumed by the live dashboards.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vehicles') then
    alter publication supabase_realtime add table public.vehicles;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'paint_orders') then
    alter publication supabase_realtime add table public.paint_orders;
  end if;

  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if to_regclass('public.status_updates') is not null
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'status_updates') then
    alter publication supabase_realtime add table public.status_updates;
  end if;

  if to_regclass('public.quality_inspections') is not null
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quality_inspections') then
    alter publication supabase_realtime add table public.quality_inspections;
  end if;
end $$;
