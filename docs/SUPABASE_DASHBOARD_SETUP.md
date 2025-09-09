# Supabase ダッシュボード設定ガイド

## 1. データベーステーブル構成

### 1.1 既存テーブルの拡張

#### projects テーブル
```sql
-- 既存のprojectsテーブルに以下のカラムを追加
ALTER TABLE projects ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Light' CHECK (plan IN ('Light', 'Standard', 'Creator'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UPLOADED' CHECK (status IN (
  'UPLOADED', 'PREPPED', 'AI_MIX_OK', 'TWEAKING', 
  'MASTERING', 'REVIEW', 'DONE', 'ARCHIVED', 'EXPIRED'
));

-- checkpointsカラムの構造例
-- {
--   "prepped": "2024-01-06T10:00:00Z",
--   "aiOk": "2024-01-06T10:30:00Z",
--   "done": "2024-01-06T11:00:00Z"
-- }
```

### 1.2 新規テーブル

#### remix_sessions テーブル
```sql
CREATE TABLE remix_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  charged BOOLEAN NOT NULL DEFAULT true,
  ended_at TIMESTAMP WITH TIME ZONE,
  end_reason TEXT, -- 'COMPLETED', 'EXPIRED', 'USER_ENDED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_remix_sessions_project_id ON remix_sessions(project_id);
CREATE INDEX idx_remix_sessions_user_id ON remix_sessions(user_id);
CREATE INDEX idx_remix_sessions_expires_at ON remix_sessions(expires_at);
CREATE INDEX idx_remix_sessions_active ON remix_sessions(expires_at, ended_at) 
  WHERE ended_at IS NULL;
```

#### event_logs テーブル
```sql
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX idx_event_logs_project_id ON event_logs(project_id);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);
```

#### user_credits テーブル
```sql
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_used DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- トリガーで更新時刻を自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

#### credit_transactions テーブル
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PURCHASE', 'REMIX', 'REFUND', 'BONUS')),
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id UUID REFERENCES remix_sessions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
```

## 2. Row Level Security (RLS) 設定

### 2.1 RLSの有効化
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE remix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
```

### 2.2 ポリシー設定

#### projects テーブル
```sql
-- ユーザーは自分のプロジェクトのみ閲覧可能
CREATE POLICY "Users can view own projects" 
  ON projects FOR SELECT 
  USING (auth.uid() = user_id);

-- ユーザーは自分のプロジェクトのみ更新可能
CREATE POLICY "Users can update own projects" 
  ON projects FOR UPDATE 
  USING (auth.uid() = user_id);

-- ユーザーは自分のプロジェクトを作成可能
CREATE POLICY "Users can create projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
```

#### remix_sessions テーブル
```sql
-- ユーザーは自分のセッションのみ閲覧可能
CREATE POLICY "Users view own remix sessions" 
  ON remix_sessions FOR SELECT 
  USING (auth.uid() = user_id);

-- サービスロールのみセッション作成可能（APIサーバー経由）
CREATE POLICY "Service creates remix sessions" 
  ON remix_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のセッションを更新可能（終了時）
CREATE POLICY "Users update own remix sessions" 
  ON remix_sessions FOR UPDATE 
  USING (auth.uid() = user_id);
```

#### event_logs テーブル
```sql
-- ユーザーは自分のイベントログのみ閲覧可能
CREATE POLICY "Users view own event logs" 
  ON event_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- イベントログは挿入のみ（更新・削除不可）
CREATE POLICY "Users create event logs" 
  ON event_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
```

#### user_credits テーブル
```sql
-- ユーザーは自分のクレジット情報のみ閲覧可能
CREATE POLICY "Users view own credits" 
  ON user_credits FOR SELECT 
  USING (auth.uid() = user_id);

-- クレジット更新はサービスロールのみ（APIサーバー経由）
-- INSERT/UPDATEポリシーは設定しない（service_roleのみ）
```

#### credit_transactions テーブル
```sql
-- ユーザーは自分の取引履歴のみ閲覧可能
CREATE POLICY "Users view own transactions" 
  ON credit_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- 取引記録はサービスロールのみ（APIサーバー経由）
-- INSERT/UPDATE/DELETEポリシーは設定しない
```

## 3. データベース関数

### 3.1 期限切れプロジェクトの自動削除
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_projects()
RETURNS void AS $$
DECLARE
  plan_days JSONB := '{"Light": 7, "Standard": 15, "Creator": 30}'::JSONB;
  project_record RECORD;
  days_limit INTEGER;
BEGIN
  FOR project_record IN 
    SELECT id, plan, created_at, user_id
    FROM projects 
    WHERE status NOT IN ('EXPIRED', 'ARCHIVED')
  LOOP
    days_limit := (plan_days->>(project_record.plan))::INTEGER;
    
    IF NOW() > project_record.created_at + INTERVAL '1 day' * days_limit THEN
      -- プロジェクトを期限切れに設定
      UPDATE projects 
      SET status = 'EXPIRED',
          updated_at = NOW()
      WHERE id = project_record.id;
      
      -- イベントログに記録
      INSERT INTO event_logs (user_id, project_id, event_type, details)
      VALUES (
        project_record.user_id,
        project_record.id,
        'AUTO_DELETE_EXPIRED',
        jsonb_build_object(
          'plan', project_record.plan,
          'createdAt', project_record.created_at,
          'expiredAt', NOW(),
          'daysLimit', days_limit
        )
      );
      
      -- ストレージからファイルを削除（オプション）
      -- PERFORM delete_project_files(project_record.id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 期限切れセッションのクリーンアップ
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_remix_sessions()
RETURNS void AS $$
BEGIN
  -- 期限切れセッションを終了
  UPDATE remix_sessions
  SET ended_at = NOW(),
      end_reason = 'EXPIRED'
  WHERE expires_at < NOW()
    AND ended_at IS NULL;
    
  -- イベントログに記録
  INSERT INTO event_logs (user_id, project_id, event_type, details)
  SELECT 
    user_id,
    project_id,
    'REMIX_SESSION_ENDED',
    jsonb_build_object(
      'reason', 'EXPIRED',
      'sessionId', id,
      'startedAt', started_at,
      'expiredAt', expires_at
    )
  FROM remix_sessions
  WHERE expires_at < NOW()
    AND ended_at = NOW()
    AND end_reason = 'EXPIRED';
END;
$$ LANGUAGE plpgsql;
```

### 3.3 クレジット消費関数
```sql
CREATE OR REPLACE FUNCTION consume_credits(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_description TEXT,
  p_project_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance DECIMAL;
  success BOOLEAN := false;
BEGIN
  -- 現在の残高を取得（ロック）
  SELECT balance INTO current_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- 残高チェック
  IF current_balance >= p_amount THEN
    -- クレジット消費
    UPDATE user_credits
    SET balance = balance - p_amount,
        total_used = total_used + p_amount
    WHERE user_id = p_user_id;
    
    -- 取引記録
    INSERT INTO credit_transactions (
      user_id, amount, type, description, 
      project_id, session_id
    ) VALUES (
      p_user_id, -p_amount, p_type, p_description,
      p_project_id, p_session_id
    );
    
    success := true;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql;
```

## 4. Cronジョブ設定（Supabase Edge Functions）

### 4.1 定期クリーンアップ関数
```typescript
// supabase/functions/cleanup-expired/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 期限切れプロジェクトのクリーンアップ
  const { error: projectError } = await supabase
    .rpc('cleanup_expired_projects')
  
  // 期限切れセッションのクリーンアップ
  const { error: sessionError } = await supabase
    .rpc('cleanup_expired_remix_sessions')

  return new Response(
    JSON.stringify({
      success: !projectError && !sessionError,
      errors: {
        projects: projectError?.message,
        sessions: sessionError?.message
      }
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### 4.2 Cronジョブ設定
```sql
-- Supabase Dashboard > Database > Extensions で pg_cron を有効化
-- その後、以下のジョブを設定

-- 毎日午前3時に実行
SELECT cron.schedule(
  'cleanup-expired-data',
  '0 3 * * *',
  $$
    SELECT cleanup_expired_projects();
    SELECT cleanup_expired_remix_sessions();
  $$
);
```

## 5. 環境変数設定

### 5.1 必要な環境変数
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# プラン別設定
NEXT_PUBLIC_PLAN_DAYS_LIGHT=7
NEXT_PUBLIC_PLAN_DAYS_STANDARD=15
NEXT_PUBLIC_PLAN_DAYS_CREATOR=30

# クレジット設定
NEXT_PUBLIC_REMIX_CREDIT_COST=0.5
NEXT_PUBLIC_REMIX_SESSION_HOURS=24
```

## 6. ストレージ設定

### 6.1 バケット構成
```sql
-- プロジェクトファイル用バケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false);

-- サムネイル用バケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true);
```

### 6.2 ストレージポリシー
```sql
-- project-files バケット
CREATE POLICY "Users can upload project files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- thumbnails バケット（公開）
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.role() = 'authenticated'
);
```

## 7. Realtime設定

### 7.1 リアルタイム更新の有効化
```sql
-- プロジェクトステータスのリアルタイム更新
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- RemixSessionのリアルタイム更新
ALTER PUBLICATION supabase_realtime ADD TABLE remix_sessions;
```

### 7.2 クライアント側のリアルタイム購読
```typescript
// リアルタイム購読の例
const subscription = supabase
  .channel('project-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'projects',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Project updated:', payload)
      // UIを更新
    }
  )
  .subscribe()
```

## 8. バックアップとリカバリー

### 8.1 定期バックアップ設定
```sql
-- 重要なテーブルのバックアップビュー作成
CREATE VIEW backup_user_data AS
SELECT 
  u.id as user_id,
  u.email,
  uc.balance as credit_balance,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT rs.id) as remix_session_count
FROM auth.users u
LEFT JOIN user_credits uc ON u.id = uc.user_id
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN remix_sessions rs ON u.id = rs.user_id
GROUP BY u.id, u.email, uc.balance;
```

## 9. モニタリングとアラート

### 9.1 監視用ビュー
```sql
-- システム統計ビュー
CREATE VIEW system_stats AS
SELECT 
  COUNT(DISTINCT user_id) as total_users,
  COUNT(DISTINCT CASE WHEN status != 'EXPIRED' THEN id END) as active_projects,
  COUNT(DISTINCT CASE WHEN ended_at IS NULL AND expires_at > NOW() THEN id END) as active_sessions,
  SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as projects_24h
FROM projects;

-- クレジット統計ビュー
CREATE VIEW credit_stats AS
SELECT 
  SUM(balance) as total_balance,
  AVG(balance) as avg_balance,
  COUNT(*) as total_users,
  COUNT(CASE WHEN balance < 1 THEN 1 END) as low_balance_users
FROM user_credits;
```

## 10. 初期データ投入

### 10.1 デフォルトユーザークレジット
```sql
-- 新規ユーザー登録時のトリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- デフォルトクレジットを付与
  INSERT INTO user_credits (user_id, balance)
  VALUES (NEW.id, 3.0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- ウェルカムボーナスの記録
  INSERT INTO credit_transactions (
    user_id, amount, type, description
  ) VALUES (
    NEW.id, 3.0, 'BONUS', 'Welcome bonus'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

## セットアップ手順

1. Supabase Dashboardにログイン
2. SQL Editorで上記のテーブル作成SQLを実行
3. Database > Extensionsでpg_cronを有効化
4. Authentication > Policiesで各テーブルのRLSを確認
5. Storage > Bucketsでストレージバケットを作成
6. Edge Functionsでクリーンアップ関数をデプロイ
7. 環境変数を設定
8. マイグレーションを実行

```bash
# マイグレーション実行
npx supabase db push

# Edge Functionsデプロイ
npx supabase functions deploy cleanup-expired
```

## トラブルシューティング

### よくある問題と解決方法

1. **RLSエラー**: ポリシーが正しく設定されているか確認
2. **クレジット不足エラー**: user_creditsテーブルにレコードが存在するか確認
3. **期限切れ処理が動作しない**: pg_cronが有効化されているか確認
4. **リアルタイム更新が動作しない**: Realtimeが有効化されているか確認