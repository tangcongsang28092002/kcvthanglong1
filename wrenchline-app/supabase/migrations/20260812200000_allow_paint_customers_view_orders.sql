do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'paint_orders'
      and policyname = 'Paint customers can view paint orders'
  ) then
    create policy "Paint customers can view paint orders"
    on public.paint_orders
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'paint_customer'
      )
    );
  end if;
end $$;
