create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'supervisor', 'cleaner')),
  display_name text not null,
  member_id text not null
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists tasks_select_by_role_or_assignment on public.tasks;
create policy tasks_select_by_role_or_assignment
on public.tasks
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'supervisor')
        or p.member_id = any (assignee_ids)
      )
  )
);

drop policy if exists tasks_insert_admin_or_supervisor on public.tasks;
create policy tasks_insert_admin_or_supervisor
on public.tasks
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'supervisor')
  )
);

drop policy if exists tasks_update_by_role_or_assignment on public.tasks;
create policy tasks_update_by_role_or_assignment
on public.tasks
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'supervisor')
        or p.member_id = any (assignee_ids)
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'supervisor')
        or p.member_id = any (assignee_ids)
      )
  )
);
