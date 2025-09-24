-- queues table maps public queueId -> creator's auth user id
create table if not exists public.queues (
  id uuid primary key,                -- queueId placed in public URL
  creator_user_id uuid not null,      -- supabase auth user.id of the creator
  status text not null default 'open',-- 'open' | 'closed'
  created_at timestamptz not null default now()
);

alter table public.queues enable row level security;

-- Anonymous viewers can resolve queueId -> creator_user_id
create policy if not exists "anon resolve queue->creator"
on public.queues for select
to anon
using (true);

-- Enforce at most one OPEN queue per creator (can relax later if we support multiple)
create unique index if not exists uq_creator_active_queue
on public.queues (creator_user_id)
where (status = 'open');