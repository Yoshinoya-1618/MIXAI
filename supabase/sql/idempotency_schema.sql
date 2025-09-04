-- Idempotency Keys management for Uta Seion
-- 冪等性管理のための専用テーブル

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  response jsonb,
  status text not null default 'processing',
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON public.idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON public.idempotency_keys(expires_at);

-- 期限切れレコードの自動削除用関数
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.idempotency_keys 
  WHERE expires_at < now();
END $$;

-- RLS設定（サービス間通信のため無効）
ALTER TABLE public.idempotency_keys DISABLE ROW LEVEL SECURITY;

-- 使用例:
-- INSERT INTO public.idempotency_keys (key, response, status) 
-- VALUES ('payment_job123_1234567890', '{"status": "success"}', 'completed')
-- ON CONFLICT (key) DO NOTHING;