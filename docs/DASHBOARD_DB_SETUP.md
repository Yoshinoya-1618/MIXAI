# ダッシュボード データベースセットアップガイド

## 🔧 問題と解決方法

### エラー1: `relation "projects" does not exist`
既存のデータベースでは`jobs`テーブルを使用しているため、`projects`テーブルが存在しません。

### エラー2: `column "project_id" does not exist`
既存のテーブルでは`job_id`を使用しています。

## ✅ 解決策

既存の`jobs`テーブルをベースに、ダッシュボード機能を互換性を保ちながら実装します。

## 📋 セットアップ手順

### 1. 互換性対応スクリプトの実行

Supabase SQL Editorで以下を実行：

```sql
-- ファイル: supabase/03-dashboard-compatible.sql
-- このファイルの内容をコピー&ペーストして実行
```

## 🏗️ 実装内容

### 1. **projectsビュー**
`jobs`テーブルをラップして、ダッシュボードが期待する`projects`インターフェースを提供

```sql
CREATE VIEW projects AS
SELECT 
  id,
  user_id,
  title,
  status,  -- jobsのstatusをダッシュボード用にマッピング
  plan,    -- plan_codeをplanとして参照
  ...
FROM public.jobs;
```

### 2. **テーブル構造の調整**
- `remix_sessions`: `job_id`を使用（`project_id`は互換性のため生成カラムとして追加）
- `event_logs`: 同様に`job_id`を使用
- `user_credits`: `credit_ledger`と自動同期

### 3. **ステータスマッピング**
```
jobs.status     → projects.status
---------------------------------
uploaded        → UPLOADED
paid            → PREPPED
processing      → TWEAKING
done            → DONE
failed          → FAILED
```

## 📂 データ構造

### 既存テーブル（変更なし）
```
jobs            - メインのジョブ管理
credit_ledger   - クレジット台帳
subscriptions   - サブスクリプション
plans           - プラン定義
```

### 新規追加
```
projects (VIEW)     - jobsテーブルのビュー
remix_sessions      - 再MIXセッション
event_logs          - イベントログ
user_credits        - クレジット残高（credit_ledgerと同期）
notifications       - 通知
credit_transactions (VIEW) - credit_ledgerのビュー
```

## 🔄 自動同期機能

### credit_ledger → user_credits
```sql
-- credit_ledgerに変更があると自動的にuser_creditsが更新される
CREATE TRIGGER sync_credits_after_ledger_change
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_ledger
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_credits_balance();
```

## 🚀 APIの変更

### エンドポイントの調整

#### 変更前（想定）
```javascript
// プロジェクトID使用
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
```

#### 変更後（互換性維持）
```javascript
// projectsビューを使用するため、変更不要
const { data } = await supabase
  .from('projects')  // ビューを参照
  .select('*')
  .eq('id', projectId)  // job_idとして動作
```

### APIファイルの修正

必要に応じて以下のファイルを調整：

1. **`app/api/v1/projects/route.ts`**
   - `projects`ビューを使用するように変更済み

2. **`app/api/v1/projects/[id]/resume/route.ts`**
   - `job_id`を内部的に使用

3. **`app/api/v1/projects/[id]/remix/route.ts`**
   - `remix_sessions`テーブルは`job_id`を使用

## ✅ 動作確認

### 1. テーブル確認
```sql
-- ビューが作成されているか確認
SELECT * FROM projects LIMIT 1;

-- remix_sessionsテーブルが作成されているか確認
SELECT * FROM remix_sessions LIMIT 1;
```

### 2. クレジット同期確認
```sql
-- credit_ledgerにデータを追加
INSERT INTO credit_ledger (user_id, event, credits, reason)
VALUES (auth.uid(), 'grant', 5.0, 'Test credit');

-- user_creditsが自動更新されているか確認
SELECT * FROM user_credits WHERE user_id = auth.uid();
```

### 3. ダッシュボードアクセス
```bash
# 開発サーバーを起動
npm run dev

# ブラウザでアクセス
http://localhost:3000/dashboard
```

## 🐛 トラブルシューティング

### エラー: `permission denied for view projects`
```sql
-- 権限を付与
GRANT SELECT ON projects TO authenticated;
```

### エラー: `trigger sync_credits_after_ledger_change already exists`
```sql
-- 既存のトリガーを削除してから再作成
DROP TRIGGER IF EXISTS sync_credits_after_ledger_change ON credit_ledger;
```

### エラー: `type job_status_extended already exists`
```sql
-- 既存の型を削除してから再作成
DROP TYPE IF EXISTS job_status_extended CASCADE;
```

## 📝 注意事項

1. **既存データの保持**: このスクリプトは既存のデータを変更しません
2. **後方互換性**: 既存のAPIは引き続き動作します
3. **ビューの制限**: `projects`ビューは読み取り専用です。更新は`jobs`テーブルに対して行います

## 🎯 次のステップ

1. スクリプトを実行
2. 環境変数を確認（`.env.local`）
3. ダッシュボードページにアクセス
4. 動作確認

## 📚 関連ドキュメント

- [SUPABASE_DASHBOARD_SETUP.md](./SUPABASE_DASHBOARD_SETUP.md) - 詳細な設定ガイド
- [CLAUDE.md](../CLAUDE.md) - 全体仕様書