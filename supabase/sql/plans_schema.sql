-- Plans — プランテーブル
create table if not exists public.plans (
  code text primary key,                  -- 'lite'|'standard'|'creator'
  name text not null,
  price_jpy integer not null,
  monthly_credits numeric not null,
  created_at timestamptz default now()
);

-- Insert default plans
insert into public.plans (code, name, price_jpy, monthly_credits) values
  ('lite', 'Lite', 1280, 3.0),
  ('standard', 'Standard', 2480, 6.0),
  ('creator', 'Creator', 5980, 10.0)
on conflict (code) do update set
  name = excluded.name,
  price_jpy = excluded.price_jpy,
  monthly_credits = excluded.monthly_credits;

-- RLS - Plans are read-only for all authenticated users
alter table public.plans enable row level security;

drop policy if exists plans_select_all on public.plans;
create policy plans_select_all on public.plans
  for select to authenticated using (true);