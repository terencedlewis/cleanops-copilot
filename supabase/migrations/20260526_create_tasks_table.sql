create table if not exists public.tasks (
  id text primary key,
  title text not null,
  area text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null check (status in ('pending', 'in-progress', 'done')),
  assignee_ids text[] not null default '{}',
  created_by text not null,
  assigned_at timestamptz not null,
  completed_at timestamptz,
  note text not null default ''
);

create index if not exists idx_tasks_assigned_at on public.tasks (assigned_at desc);
