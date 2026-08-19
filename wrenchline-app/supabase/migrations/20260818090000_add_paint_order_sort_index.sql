-- Manual drag-and-drop order for paint orders. NULL means "no custom order
-- set yet" — those rows fall back to the previous automatic ordering
-- (priority tier, then newest first) until someone drags them.
alter table public.paint_orders
  add column if not exists sort_index integer;

-- Backfill so existing active (not-done) orders start from a sensible
-- baseline that matches what users currently see, instead of everyone
-- starting at NULL and jumping around the first time someone drags a row.
-- Gaps of 10 leave room to insert rows between existing ones later.
with ranked as (
  select
    id,
    row_number() over (
      order by
        case priority
          when 'do_first' then 0
          when 'sequential' then 1
          when 'do_later' then 2
          else 1
        end,
        created_at desc
    ) as rn
  from public.paint_orders
  where status <> 'done'
)
update public.paint_orders p
set sort_index = ranked.rn * 10
from ranked
where p.id = ranked.id
  and p.sort_index is null;
