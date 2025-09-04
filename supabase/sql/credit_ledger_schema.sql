-- Credit Ledger — クレジット台帳テーブル
-- Types
create type if not exists credit_event as enum ('grant','consume','purchase','rollback','expire');

-- Table
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  event credit_event not null,
  credits numeric not null,               -- 正: 付与/購入、負: 消費
  reason text,
  job_id uuid references public.jobs(id),
  created_at timestamptz default now()
);

-- RLS
alter table public.credit_ledger enable row level security;

drop policy if exists credit_ledger_select_own on public.credit_ledger;
create policy credit_ledger_select_own on public.credit_ledger
  for select using (auth.uid() = user_id);

drop policy if exists credit_ledger_insert_self on public.credit_ledger;
create policy credit_ledger_insert_self on public.credit_ledger
  for insert with check (auth.uid() = user_id);

-- Function to get current credit balance
create or replace function public.get_credit_balance(user_uuid uuid)
returns numeric language plpgsql security definer as $$
declare
  balance numeric;
begin
  select coalesce(sum(credits), 0) 
  into balance 
  from public.credit_ledger 
  where user_id = user_uuid;
  
  return balance;
end $$;

-- Grant function to authenticated users
grant execute on function public.get_credit_balance(uuid) to authenticated;