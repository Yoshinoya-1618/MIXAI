-- Subscriptions — サブスクリプションテーブル
-- Types
create type if not exists sub_status as enum ('none','active','past_due','canceled');

-- Table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  plan_code text references public.plans(code),
  status sub_status not null default 'none',
  current_period_start timestamptz,
  current_period_end timestamptz,
  auto_renew boolean default true,
  auto_buy_addon boolean default true,   -- 残高不足時の自動追加購入
  stripe_subscription_id text,           -- Stripe連携用
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at trigger
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
for each row execute function public.set_updated_at();

-- RLS
alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists subscriptions_insert_self on public.subscriptions;
create policy subscriptions_insert_self on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists subscriptions_update_own on public.subscriptions;
create policy subscriptions_update_own on public.subscriptions
  for update using (auth.uid() = user_id);

-- Function to get user's active subscription
create or replace function public.get_active_subscription(user_uuid uuid)
returns table (
  id uuid,
  plan_code text,
  status sub_status,
  current_period_start timestamptz,
  current_period_end timestamptz,
  auto_renew boolean,
  auto_buy_addon boolean
) language plpgsql security definer as $$
begin
  return query
  select s.id, s.plan_code, s.status, s.current_period_start, 
         s.current_period_end, s.auto_renew, s.auto_buy_addon
  from public.subscriptions s
  where s.user_id = user_uuid 
    and s.status = 'active'
  order by s.created_at desc
  limit 1;
end $$;

-- Grant function to authenticated users
grant execute on function public.get_active_subscription(uuid) to authenticated;