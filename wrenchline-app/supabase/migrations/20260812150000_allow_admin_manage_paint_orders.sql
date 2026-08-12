-- Administrators can edit and delete paint orders from the management screen.
-- This complements existing policies without granting these rights to other roles.

create policy "Admins can update paint orders"
on public.paint_orders
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

create policy "Admins can delete paint orders"
on public.paint_orders
for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);
