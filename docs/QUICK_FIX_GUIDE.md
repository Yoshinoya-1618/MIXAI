# クイックフィックスガイド

## 🚀 最速でダッシュボードを動作させる方法

### ステップ1: シンプルなカラム追加

Supabase SQL Editorで以下を実行：

```sql
-- ファイル: supabase/07-simple-column-fix.sql
-- このファイルの内容を全てコピー&ペースト

-- または以下を直接実行：

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS preset_key TEXT,
ADD COLUMN IF NOT EXISTS duration_s INTEGER,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'lite';
```

### ステップ2: 確認

```sql
-- カラムが追加されたか確認
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('preset_key', 'duration_s', 'title', 'plan_code');
```

### ステップ3: アプリケーション再起動

```bash
# Next.jsを再起動
npm run dev
```

## ✅ これで解決するエラー

- ✅ `column jobs.preset_key does not exist`
- ✅ `column jobs.duration_s does not exist`
- ✅ `column jobs.title does not exist`
- ✅ `column jobs.plan_code does not exist`

## 📝 エラーの原因

1. **SQL文法エラー（RAISE NOTICE）**
   - `RAISE NOTICE`はDOブロック外では使用できない
   - 解決: DOブロック内に移動またはコメントアウト

2. **カラム不足**
   - APIが期待するカラムがデータベースに存在しない
   - 解決: `ALTER TABLE ADD COLUMN IF NOT EXISTS`で追加

## 🔍 デバッグのヒント

### エラーが続く場合

1. **ブラウザのキャッシュをクリア**
   - Ctrl + Shift + R（強制リロード）

2. **サーバーログを確認**
   ```bash
   npm run dev
   # エラーメッセージを確認
   ```

3. **Supabaseで直接確認**
   ```sql
   -- jobsテーブルの全カラムを表示
   SELECT * FROM jobs LIMIT 1;
   ```

## 🎯 最小限の動作確認

以下が動作すれば成功：

```sql
-- 基本的なクエリ
SELECT id, status, created_at FROM jobs LIMIT 1;

-- projectsビューの確認
SELECT * FROM projects LIMIT 1;
```

## 📌 重要なポイント

1. **IF NOT EXISTS**を使用
   - カラムが既に存在してもエラーにならない
   - 安全に複数回実行可能

2. **シンプルなSQL**
   - 複雑な条件分岐を避ける
   - 一つずつ確実に実行

3. **APIの柔軟性**
   - APIは既に修正済み
   - カラムが存在しなくても基本動作は可能

## 🆘 それでも解決しない場合

### 完全リセット（最終手段）

```sql
-- 注意: データが失われる可能性があります

-- 1. ビューを削除
DROP VIEW IF EXISTS projects CASCADE;

-- 2. カラムを強制追加
ALTER TABLE public.jobs 
ADD COLUMN preset_key TEXT DEFAULT NULL,
ADD COLUMN duration_s INTEGER DEFAULT NULL,
ADD COLUMN title TEXT DEFAULT NULL,
ADD COLUMN plan_code TEXT DEFAULT 'lite';

-- 3. ビューを再作成
CREATE VIEW projects AS SELECT * FROM jobs;

-- 4. 権限設定
GRANT ALL ON projects TO authenticated;
```

## ✨ 成功の確認

ダッシュボードにアクセス：
```
http://localhost:3000/dashboard
```

- プロジェクト一覧が表示される
- エラーメッセージが出ない
- 基本的な操作が可能

これで問題が解決するはずです！