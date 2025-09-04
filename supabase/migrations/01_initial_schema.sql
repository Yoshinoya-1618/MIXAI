-- CLAUDE.mdに基づくデータベーススキーマ

-- 1. Enums（列挙型）の定義
create type job_status as enum ('uploaded','paid','processing','done','failed');
create type inst_policy as enum ('bypass','safety','rescue');
create type credit_event as enum ('grant','consume','purchase','rollback','expire');
create type sub_status as enum ('none','active','past_due','canceled');

-- 2. プラン定義テーブル
create table public.plans (
  code text primary key,                  -- 'lite'|'standard'|'creator'
  name text not null,
  price_jpy integer not null,
  monthly_credits numeric not null,
  created_at timestamptz default now()
);

-- 3. メインのジョブテーブル
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status job_status not null default 'uploaded',

  -- 入力/出力ファイル
  instrumental_path text,
  vocal_path text,
  result_path text,
  out_format text default 'mp3',          -- 'mp3'|'wav'
  sample_rate int default 44100,          -- 44100|48000
  bit_depth int default 16,               -- 16|24 (wav時)

  -- 解析/処理パラメータ
  plan_code text references public.plans(code),
  preset_key text,                        -- 'clean_light'等（12種）
  inst_policy inst_policy default 'bypass',
  micro_adjust jsonb,                     -- {forwardness, space, brightness}
  offset_ms integer,                      -- 自動頭出し結果
  atempo numeric,                         -- 例: 0.98～1.03
  tempo_map_applied boolean default false,
  rescue_applied boolean default false,

  -- メトリクス（Before/After）
  beat_dev_ms_before numeric,             -- 拍ズレ平均（ms）
  beat_dev_ms_after numeric,
  pitch_err_cent_before numeric,          -- ノート中心誤差（cent）
  pitch_err_cent_after numeric,
  hnr_before numeric,                     -- Harmonic-to-Noise Ratio
  hnr_after numeric,

  -- ラウドネス
  target_lufs numeric not null default -14,
  measured_lufs numeric,
  true_peak numeric,

  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. クレジット台帳
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  event credit_event not null,
  credits numeric not null,               -- 正: 付与/購入、負: 消費
  reason text,
  job_id uuid references public.jobs(id),
  created_at timestamptz default now()
);

-- 5. サブスクリプション
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  plan_code text references public.plans(code),
  status sub_status not null default 'none',
  current_period_start timestamptz,
  current_period_end timestamptz,
  auto_renew boolean default true,
  auto_buy_addon boolean default true,    -- 残高不足時の自動追加購入
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. RLSポリシーの設定
alter table public.jobs enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.subscriptions enable row level security;

-- ユーザーは自分のデータのみアクセス可能
create policy "Users can view own jobs" on public.jobs
  for all using (auth.uid() = user_id);

create policy "Users can view own credit ledger" on public.credit_ledger
  for all using (auth.uid() = user_id);

create policy "Users can view own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id);

-- 7. インデックス作成（パフォーマンス向上）
create index idx_jobs_user_id on public.jobs(user_id);
create index idx_jobs_status on public.jobs(status);
create index idx_jobs_created_at on public.jobs(created_at);
create index idx_credit_ledger_user_id on public.credit_ledger(user_id);
create index idx_subscriptions_user_id on public.subscriptions(user_id);

-- 8. 初期プランデータの挿入
insert into public.plans (code, name, price_jpy, monthly_credits) values
  ('lite', 'Lite', 1280, 3.0),
  ('standard', 'Standard', 2480, 6.0),
  ('creator', 'Creator', 5980, 10.0);

-- 9. トリガー関数（更新時刻の自動更新）
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_jobs_updated_at
  before update on public.jobs
  for each row execute procedure public.handle_updated_at();

create trigger handle_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();

-- 10. ストレージバケットの作成（Supabase Storage用）
insert into storage.buckets (id, name, public) values 
  ('uta-uploads', 'uta-uploads', false),
  ('uta-results', 'uta-results', false);

-- 11. ストレージのRLSポリシー
create policy "Users can upload to own path in uta-uploads"
  on storage.objects for insert
  with check (
    bucket_id = 'uta-uploads' and 
    (storage.foldername(name))[1] = 'users' and
    (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can view own uploads"
  on storage.objects for select
  using (
    bucket_id = 'uta-uploads' and 
    (storage.foldername(name))[1] = 'users' and
    (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can view own results"
  on storage.objects for select
  using (
    bucket_id = 'uta-results' and 
    (storage.foldername(name))[1] = 'users' and
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Worker用のポリシー（結果ファイルの書き込み用）
-- 実際の実装ではservice_role keyを使用