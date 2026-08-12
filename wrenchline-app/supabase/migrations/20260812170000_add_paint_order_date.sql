alter table public.paint_orders
  add column if not exists ngay_len_don date;

update public.paint_orders
set ngay_len_don = (created_at at time zone 'Asia/Ho_Chi_Minh')::date
where ngay_len_don is null;
