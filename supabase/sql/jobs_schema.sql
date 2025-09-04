-- Uta Seion — DB schema & RLS (Updated to CLAUDE.md specification)
-- Types
create type if not exists job_status as enum ('uploaded','paid','processing','done','failed');
create type if not exists inst_policy as enum ('bypass','safety','rescue');

-- Table
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status job_status not null default 'uploaded',

  -- 入力/出力
  instrumental_path text,
  vocal_path text,
  result_path text,
  out_format text default 'mp3',      -- 'mp3'|'wav'
  sample_rate int,                    -- 44100|48000
  bit_depth int,                      -- 16|24 (wav時)

  -- 解析/処理パラメータ
  plan_code text references public.plans(code),
  preset_key text,                    -- 'clean_light'等（12種）
  inst_policy inst_policy default 'bypass',
  micro_adjust jsonb,                 -- {forwardness, space, brightness}
  offset_ms integer,                  -- 自動頭出し結果
  atempo numeric,                     -- 例: 0.98～1.03
  tempo_map_applied boolean default false,
  rescue_applied boolean default false,

  -- メトリクス（Before/After）
  beat_dev_ms_before numeric,         -- 拍ズレ平均（ms）
  beat_dev_ms_after numeric,
  pitch_err_cent_before numeric,      -- ノート中心誤差（cent）
  pitch_err_cent_after numeric,
  hnr_before numeric,                 -- Harmonic-to-Noise Ratio
  hnr_after numeric,

  -- ラウドネス
  target_lufs numeric not null default -14,
  measured_lufs numeric,
  true_peak numeric,

  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_jobs_updated on public.jobs;
create trigger trg_jobs_updated before update on public.jobs
for each row execute function public.set_updated_at();

-- RLS
alter table public.jobs enable row level security;

drop policy if exists jobs_select_own on public.jobs;
create policy jobs_select_own on public.jobs
  for select using (auth.uid() = user_id);

drop policy if exists jobs_insert_self on public.jobs;
create policy jobs_insert_self on public.jobs
  for insert with check (auth.uid() = user_id);

drop policy if exists jobs_update_own on public.jobs;
create policy jobs_update_own on public.jobs
  for update using (auth.uid() = user_id);
