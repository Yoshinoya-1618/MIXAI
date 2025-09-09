# ダッシュボード トラブルシューティングガイド

## 🔧 よくあるエラーと解決方法

### 1. `column jobs.preset_key does not exist`

**原因**: APIが`preset_key`カラムを期待しているが、データベースに存在しない

**解決方法**:

#### 方法1: カラムを追加（推奨）
```sql
-- Supabase SQL Editorで実行
-- ファイル: supabase/05-add-missing-columns.sql
```

#### 方法2: APIを修正（代替案）
APIファイル（`app/api/dashboard/route.ts`）を修正済み。存在しないカラムを参照しないように変更。

### 2. `column jobs.plan_code does not exist`

**原因**: `plan_code`カラムが存在しない

**解決方法**:
```sql
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'lite';
```

### 3. `relation "projects" does not exist`

**原因**: projectsビューが作成されていない

**解決方法**:
```sql
-- 04-dashboard-safe-setup.sql を実行
```

## 📋 完全セットアップ手順

### ステップ1: 基本カラムの追加
```sql
-- 必要なカラムを追加
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'lite',
ADD COLUMN IF NOT EXISTS preset_key TEXT,
ADD COLUMN IF NOT EXISTS duration_s INTEGER,
ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS harmony_path TEXT;
```

### ステップ2: projectsビューの作成
```sql
CREATE OR REPLACE VIEW projects AS
SELECT 
  id,
  user_id,
  COALESCE(title, 'Untitled Project') as title,
  CASE 
    WHEN status::text = 'uploaded' THEN 'UPLOADED'
    WHEN status::text = 'paid' THEN 'PREPPED'
    WHEN status::text = 'processing' THEN 'TWEAKING'
    WHEN status::text = 'done' THEN 'DONE'
    WHEN status::text = 'failed' THEN 'FAILED'
    ELSE UPPER(status::text)
  END as status,
  COALESCE(plan_code, 'lite') as plan,
  instrumental_path,
  vocal_path,
  harmony_path,
  result_path,
  preset_key,
  duration_s,
  error,
  checkpoints,
  thumbnail_url,
  settings,
  metadata,
  created_at,
  updated_at
FROM public.jobs;

GRANT SELECT ON projects TO authenticated;
```

### ステップ3: ダッシュボードテーブルの作成
```sql
-- 04-dashboard-safe-setup.sql の実行
-- または個別に必要なテーブルを作成
```

## 🔍 デバッグ方法

### 1. テーブル構造の確認
```sql
-- jobsテーブルのカラムを確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'jobs'
ORDER BY ordinal_position;
```

### 2. ビューの確認
```sql
-- projectsビューが存在するか確認
SELECT * FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'projects';
```

### 3. エラーログの確認
```javascript
// ブラウザのコンソールで
console.log('Dashboard API Error:', error);

// サーバーログで
npm run dev
// エラーメッセージを確認
```

## 🚀 クイックフィックス

### 全てを一度にセットアップ
```sql
-- 1. カラム追加
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'lite',
ADD COLUMN IF NOT EXISTS preset_key TEXT,
ADD COLUMN IF NOT EXISTS duration_s INTEGER,
ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS harmony_path TEXT;

-- 2. ビュー作成
DROP VIEW IF EXISTS projects CASCADE;
CREATE VIEW projects AS
SELECT * FROM public.jobs;
GRANT SELECT ON projects TO authenticated;

-- 3. 基本的なダッシュボードテーブル
CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 権限設定
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

## 📝 API側の対策

### エラーハンドリングの改善
APIは以下の対策を実装済み：

1. **カラム存在チェック**: 存在しないカラムを参照しない
2. **フォールバック**: 基本カラムのみで動作
3. **デフォルト値**: プランやタイトルのデフォルト値を設定

```typescript
// app/api/dashboard/route.ts
if (jobsError.code === '42703') {
  // カラムが存在しない場合の処理
  // 基本的なカラムのみで再試行
}
```

## ✅ 確認チェックリスト

- [ ] jobsテーブルが存在する
- [ ] 必要なカラムが追加されている
- [ ] projectsビューが作成されている
- [ ] RLS権限が設定されている
- [ ] APIエラーが解消されている
- [ ] ダッシュボードページが表示される

## 🆘 それでも解決しない場合

1. **Supabaseを再起動**
   ```bash
   npx supabase stop
   npx supabase start
   ```

2. **キャッシュをクリア**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **最小構成で確認**
   ```sql
   -- 最小限のテスト
   SELECT id, status, created_at, updated_at 
   FROM jobs 
   LIMIT 1;
   ```

## 📚 関連ドキュメント

- [DASHBOARD_DB_SETUP.md](./DASHBOARD_DB_SETUP.md)
- [DASHBOARD_FINAL_SETUP.md](./DASHBOARD_FINAL_SETUP.md)
- [SUPABASE_DASHBOARD_SETUP.md](./SUPABASE_DASHBOARD_SETUP.md)