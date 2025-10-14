-- Create user_balances to support anonymous signup initialization and balance tracking
create table if not exists public.user_balances (
  user_id uuid primary key,
  balance_skips integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS and restrict writes to SECURITY DEFINER functions only
alter table public.user_balances enable row level security;

-- Allow users to view their own balance (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_balances' 
      AND policyname = 'Users can view their own balance'
  ) THEN
    CREATE POLICY "Users can view their own balance"
      ON public.user_balances
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Transactions ledger for Skips (if not present)
create table if not exists public.skips_transactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid,
  to_user_id uuid,
  amount_skips integer not null,
  transaction_type text not null,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.skips_transactions enable row level security;

-- Allow either party to view their own transactions (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'skips_transactions' 
      AND policyname = 'Users can view their own skip transactions'
  ) THEN
    CREATE POLICY "Users can view their own skip transactions"
      ON public.skips_transactions
      FOR SELECT
      USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
  END IF;
END $$;

-- Ensure the auth.users trigger exists to initialize profiles/creators and balances
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Guardrail: prevent duplicate active queue entries for the same creator/fan
CREATE UNIQUE INDEX IF NOT EXISTS uq_call_queue_active_unique
  ON public.call_queue (creator_id, fan_id)
  WHERE (status = 'waiting' OR fan_state = 'in_call');
