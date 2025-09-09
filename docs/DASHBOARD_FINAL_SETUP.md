# ダッシュボード最終セットアップガイド

## 🎯 このスクリプトの特徴

既存のデータベース構造を**安全に確認しながら**必要な機能を追加します。

## ✅ 解決された問題

1. ✅ `relation "projects" does not exist` → projectsビューを作成
2. ✅ `column "project_id" does not exist` → job_idを使用し、project_idは仮想カラムとして追加
3. ✅ `column "plan_code" does not exist` → カラムの存在を確認してから参照

## 📋 実行手順

### 1. Supabase SQL Editorで実行

```sql
-- ファイル: supabase/04-dashboard-safe-setup.sql
-- このファイルの内容を全てコピー&ペーストして実行
```

### 2. 実行結果の確認

正常に実行されると以下のようなメッセージが表示されます：

```
NOTICE: Checking existing table structure...
NOTICE: Table "jobs" exists
NOTICE: Added column: title
NOTICE: Added column: checkpoints
...
NOTICE: ====================================
NOTICE: Dashboard setup completed!
NOTICE: ====================================
NOTICE: Tables created: 4 / 4
NOTICE: Views created: 3 / 3
NOTICE: The dashboard is now ready to use!
```

## 🔍 スクリプトの動作

### 1. **カラムの安全な追加**
```sql
-- カラムが存在しない場合のみ追加
IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'jobs' AND column_name = 'title'
) THEN
  ALTER TABLE jobs ADD COLUMN title TEXT;
END IF;
```

### 2. **条件付きビュー作成**
```sql
-- plan_codeカラムの存在を確認してから使用
CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE column_name = 'plan_code'
  ) THEN COALESCE(j.plan_code, 'lite')
  ELSE 'lite'
END as plan
```

### 3. **互換性の維持**
- `job_id`を主キーとして使用
- `project_id`は生成カラムとして追加（APIの互換性のため）

## 📊 作成される構造

### テーブル
```
remix_sessions    - 再MIXセッション管理
event_logs        - イベントログ
user_credits      - クレジット残高
notifications     - 通知
```

### ビュー
```
projects          - jobsテーブルのラッパー
credit_transactions - credit_ledgerのラッパー
dashboard_stats   - 統計情報
```

### 仮想カラム
```
remix_sessions.project_id = job_id（互換性用）
event_logs.project_id = job_id（互換性用）
notifications.project_id = job_id（互換性用）
```

## 🚀 動作確認

### 1. テーブル確認
```sql
-- projectsビューが動作するか確認
SELECT * FROM projects LIMIT 1;

-- remix_sessionsテーブルが作成されたか確認
SELECT * FROM remix_sessions LIMIT 1;
```

### 2. ダッシュボードアクセス
```bash
# 開発サーバーを起動
npm run dev

# ブラウザでアクセス
http://localhost:3000/dashboard
```

## 🔧 APIの調整

既存のAPIコードは最小限の変更で動作します：

### app/api/v1/projects/route.ts
```typescript
// projectsビューを使用（変更不要）
const { data } = await supabase
  .from('projects')  // ビューを参照
  .select('*')
```

### app/api/v1/projects/[id]/resume/route.ts
```typescript
// プロジェクトIDとして受け取るが、内部的にはjob_id
const projectId = params.id  // これはjob_id
```

## 🐛 トラブルシューティング

### エラー: まだエラーが出る場合

1. **jobsテーブルが存在しない**
   ```sql
   -- 初期マイグレーションを実行
   -- supabase/migrations/01_initial_schema.sql を実行
   ```

2. **権限エラー**
   ```sql
   -- 権限を付与
   GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
   ```

3. **plan_codeカラムがまだ存在しない**
   ```sql
   -- 手動で追加
   ALTER TABLE public.jobs 
   ADD COLUMN IF NOT EXISTS plan_code TEXT DEFAULT 'lite';
   ```

## ✅ 最終チェックリスト

- [ ] スクリプトが正常に実行された
- [ ] projectsビューが作成された
- [ ] remix_sessionsテーブルが作成された
- [ ] user_creditsテーブルが作成された
- [ ] ダッシュボードページが表示される

## 📝 注意事項

1. **既存データは変更されません**
2. **後方互換性が維持されます**
3. **エラーが出ても安全です**（IF NOT EXISTSを使用）

## 🎉 完了

これでダッシュボード機能が使用可能になりました！

問題が解決しない場合は、以下を確認してください：
- Supabase Dashboardのログ
- ブラウザの開発者コンソール
- Next.jsのサーバーログ