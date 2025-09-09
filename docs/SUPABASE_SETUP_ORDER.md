# Supabase セットアップ手順

## エラー解決：relation "projects" does not exist

このエラーは基本テーブルがまだ作成されていないために発生しています。
以下の順序でSQLスクリプトを実行してください。

## 📋 実行順序

### ステップ 1: 基本テーブルの作成
```sql
-- Supabase Dashboard > SQL Editor で実行
-- ファイル: supabase/01-create-base-tables.sql
```

このスクリプトで作成されるテーブル：
- `projects` - プロジェクト管理
- `jobs` - 処理タスク管理
- `user_settings` - ユーザー設定
- `files` - ファイル管理
- `presets` - プリセット管理

### ステップ 2: ダッシュボード関連テーブルの作成
```sql
-- Supabase Dashboard > SQL Editor で実行
-- ファイル: supabase/02-create-dashboard-tables.sql
```

このスクリプトで作成されるテーブル：
- `remix_sessions` - 再MIXセッション管理
- `event_logs` - イベントログ
- `user_credits` - クレジット残高
- `credit_transactions` - クレジット取引履歴
- `notifications` - 通知管理

## 🚀 クイックセットアップ

### 1. Supabase Dashboardにログイン

### 2. SQL Editorを開く
- 左メニューから「SQL Editor」を選択

### 3. スクリプトを順番に実行

#### 実行方法1: ファイルの内容をコピー&ペースト
```bash
# ターミナルから内容を表示
cat supabase/01-create-base-tables.sql
# 内容をコピーしてSQL Editorにペースト → Run
```

#### 実行方法2: 直接SQL Editorで記述
1. 新しいクエリタブを開く
2. ファイルの内容をコピー
3. 「Run」または「Ctrl+Enter」で実行

### 4. 実行確認

各スクリプト実行後に以下のメッセージが表示されます：

**01-create-base-tables.sql 実行後:**
```
NOTICE: Base tables created successfully!
NOTICE: Tables: projects, jobs, user_settings, files, presets
NOTICE: RLS policies applied
NOTICE: Triggers and functions created

NOTICE: Next step: Run 02-create-dashboard-tables.sql
```

**02-create-dashboard-tables.sql 実行後:**
```
NOTICE: Dashboard tables created successfully!
NOTICE: Tables: remix_sessions, event_logs, user_credits, credit_transactions, notifications
NOTICE: Functions: cleanup_expired_projects, cleanup_expired_remix_sessions, consume_credits, add_credits
NOTICE: Views: project_dashboard_stats

NOTICE: Setup complete! Your dashboard is ready to use.
```

## ✅ セットアップ確認

### Table Editorで確認
左メニューの「Table Editor」から以下のテーブルが存在することを確認：

**基本テーブル:**
- [ ] projects
- [ ] jobs
- [ ] user_settings
- [ ] files
- [ ] presets

**ダッシュボードテーブル:**
- [ ] remix_sessions
- [ ] event_logs
- [ ] user_credits
- [ ] credit_transactions
- [ ] notifications

### RLS確認
Authentication > Policies で各テーブルのRLSが有効になっていることを確認

### Functions確認
Database > Functions で以下の関数が作成されていることを確認：
- [ ] update_updated_at
- [ ] cleanup_expired_projects
- [ ] cleanup_expired_remix_sessions
- [ ] consume_credits
- [ ] add_credits
- [ ] handle_new_user_base
- [ ] handle_new_user_credits

## 🔧 トラブルシューティング

### エラー: "relation already exists"
→ テーブルが既に存在します。問題ありません。

### エラー: "permission denied"
→ Supabaseの管理者権限でログインしているか確認してください。

### エラー: "function gen_random_uuid() does not exist"
→ 以下を実行してuuid拡張を有効化：
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## 📝 追加設定（オプション）

### リアルタイム機能を有効にする場合
```sql
-- Replication > Publicationsで設定
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE remix_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 定期クリーンアップを設定する場合
```sql
-- pg_cron拡張を有効化後
SELECT cron.schedule(
  'cleanup-expired',
  '0 3 * * *',  -- 毎日午前3時
  $$
    SELECT cleanup_expired_projects();
    SELECT cleanup_expired_remix_sessions();
  $$
);
```

## 🎉 完了

これでMIXAIダッシュボードのSupabase設定が完了しました！

次のステップ：
1. `.env.local`に環境変数を設定
2. `npm run dev`でアプリケーションを起動
3. `/dashboard`にアクセスして動作確認