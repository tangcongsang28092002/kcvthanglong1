-- Allow an administrator to permanently remove an employee account.
-- Run this migration in the Supabase SQL Editor (or with `supabase db push`).

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  reference record;
begin
  -- The function is callable from the browser, so authorisation must be
  -- enforced here instead of relying on the UI.
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để thực hiện thao tác này';
  end if;

  if auth.uid() = target_user_id then
    raise exception 'Không thể xóa chính tài khoản đang đăng nhập';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Chỉ quản lý mới có quyền xóa tài khoản';
  end if;

  -- A profile can be referenced by operational records (for example,
  -- vehicles.created_by and tasks.assigned_to). Transfer every relationship
  -- to the administrator who is deleting the account before the account is
  -- removed. This preserves all records and avoids NOT NULL violations.
  --
  -- The loop covers every single-column foreign key to profiles or auth.users,
  -- so it also handles tables added after this migration was written.
  for reference in
    select
      namespace.nspname as schema_name,
      relation.relname as table_name,
      attribute.attname as column_name
    from pg_constraint c
    join pg_class relation on relation.oid = c.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    join pg_attribute attribute
      on attribute.attrelid = relation.oid
      and attribute.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
      and array_length(c.conkey, 1) = 1
      and namespace.nspname = 'public'
      -- profiles.id is the employee's primary key as well as a foreign key to
      -- auth.users. It must be deleted by the auth cascade, never reassigned.
      and not (relation.relname = 'profiles' and attribute.attname = 'id')
  loop
    execute format(
      'update %I.%I set %I = $1 where %I = $2',
      reference.schema_name, reference.table_name,
      reference.column_name, reference.column_name
    ) using auth.uid(), target_user_id;
  end loop;

  -- Deleting auth.users removes the matching profiles row through the normal
  -- profiles.id -> auth.users.id ON DELETE CASCADE relationship.
  delete from auth.users where id = target_user_id;

  if not found then
    raise exception 'Không tìm thấy tài khoản cần xóa';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
