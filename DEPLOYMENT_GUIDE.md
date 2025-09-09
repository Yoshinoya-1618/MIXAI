# MIXAI デプロイメントガイド

## 目次
1. [事前準備](#事前準備)
2. [環境変数の設定](#環境変数の設定)
3. [データベースのセットアップ](#データベースのセットアップ)
4. [Vercelへのデプロイ](#vercelへのデプロイ)
5. [デプロイ後の確認](#デプロイ後の確認)
6. [トラブルシューティング](#トラブルシューティング)

## 事前準備

### 必要なアカウント
- [ ] Supabaseアカウント
- [ ] Stripeアカウント
- [ ] Vercelアカウント（推奨）
- [ ] GitHubアカウント

### 必要なツール
- Node.js 20以上
- npm または yarn
- Git

## 環境変数の設定

### 1. 環境変数ファイルの作成

```bash
# .env.exampleをコピー
cp .env.example .env.local
```

### 2. 必須の環境変数

#### Supabase設定
1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. Settings > API から以下を取得：
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role key（秘密にする）

#### Stripe設定
1. [Stripe Dashboard](https://dashboard.stripe.com)にログイン
2. Developers > API keys から取得：
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: 公開可能キー
   - `STRIPE_SECRET_KEY`: シークレットキー
3. Developers > Webhooks でエンドポイントを作成：
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - イベント: `checkout.session.completed`, `customer.subscription.*`
   - `STRIPE_WEBHOOK_SECRET`: Signing secret

#### 価格IDの設定
Stripe Dashboardで商品と価格を作成し、価格IDを設定：
```env
NEXT_PUBLIC_STRIPE_PRICE_LITE_PLAN=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_STANDARD_PLAN=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_CREATOR_PLAN=price_xxx
```

### 3. オプションの環境変数

#### Cron認証（本番環境）
```bash
# ランダムな文字列を生成
openssl rand -base64 32
```
生成された文字列を`CRON_SECRET`に設定

#### AI/ML機能
```env
# 初期は無効にしておく
ENABLE_CPU_ML=false
ML_MIN_SAMPLES=1000
USE_MOCK_ML=true
```

## データベースのセットアップ

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://app.supabase.com)で新規プロジェクト作成
2. プロジェクト名、データベースパスワード、リージョンを設定

### 2. マイグレーションの実行

#### 方法1: Supabase CLIを使用（推奨）

```bash
# Supabase CLIのインストール
npm install -g supabase

# ログイン
supabase login

# プロジェクトとリンク
supabase link --project-ref your-project-ref

# マイグレーション実行
supabase db push
```

#### 方法2: SQL Editorで手動実行

1. Supabase Dashboard > SQL Editor
2. 以下の順番でマイグレーションファイルを実行：

```sql
-- 実行順序（重要）
1. 001_create_billing_tables.sql
2. 002_rls_policies.sql
3. 003_create_storage_buckets.sql
4. 004_create_analytics_tables.sql
5. 005_add_trial_fields.sql
6. 006_update_pricing_and_credits.sql
7. 011_add_theme_key_to_jobs.sql
8. 012_add_processing_queue.sql
9. 013_add_data_cleanup_fields.sql
10. 20250109_create_admin_tables_fixed.sql
11. 20250110_create_ai_learning_tables.sql
12. 20250110_add_trimmed_inst_path.sql
13. 20250110_add_ml_inference_columns.sql
```

### 3. ストレージバケットの設定

1. Supabase Dashboard > Storage
2. 以下のバケットを作成（公開設定）：
   - `audio` - 音声ファイル用
   - `avatars` - ユーザーアバター用
   - `previews` - プレビューファイル用
   - `models` - MLモデル用（非公開）

### 4. 認証設定

1. Authentication > Providers
2. Email認証を有効化
3. 必要に応じてSocial認証を設定（Google, Twitter等）

## Vercelへのデプロイ

### 1. GitHubリポジトリの準備

```bash
# リポジトリの初期化
git init
git add .
git commit -m "Initial commit"

# GitHubにpush
git remote add origin https://github.com/yourusername/mixai.git
git push -u origin main
```

### 2. Vercelプロジェクトの作成

1. [Vercel](https://vercel.com)にログイン
2. "New Project" をクリック
3. GitHubリポジトリをインポート
4. Framework Preset: Next.js を選択

### 3. 環境変数の設定

Vercel Dashboard > Settings > Environment Variables で設定：

```env
# 本番環境用の値を設定
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CRON_SECRET=
# ... その他の環境変数
```

### 4. デプロイ

```bash
# Vercel CLIを使用
npm i -g vercel
vercel

# または GitHubにpushすると自動デプロイ
git push origin main
```

## デプロイ後の確認

### 1. 基本動作確認

- [ ] トップページが表示される
- [ ] ログイン/サインアップが動作する
- [ ] プラン選択ページが表示される
- [ ] Stripe決済が動作する

### 2. 管理機能の確認

1. 管理者アカウントの設定：

```sql
-- Supabase SQL Editorで実行
UPDATE profiles 
SET roles = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

2. 管理画面へのアクセス：
   - `/admin` - ダッシュボード
   - `/admin/users` - ユーザー管理
   - `/admin/ml` - ML管理

### 3. Cronジョブの確認

Vercel Dashboard > Functions > Logs で以下を確認：
- `/api/cron/cleanup` - 毎日3時に実行
- `/api/cron/train` - 毎週日曜3時に実行

### 4. フィーチャーフラグの初期設定

```sql
-- ML機能を段階的に有効化
UPDATE feature_flags 
SET is_enabled = false, rollout_percentage = 0
WHERE key LIKE 'enable_%ml%';
```

## トラブルシューティング

### ビルドエラー

#### TypeScriptエラー
```bash
# 型チェックをスキップしてビルド（一時的な対処）
npm run build -- --no-lint
```

#### 依存関係エラー
```bash
# キャッシュクリア
rm -rf node_modules .next
npm install
npm run build
```

### データベース接続エラー

1. Supabase URLとキーを確認
2. RLSポリシーを確認
3. サービスロールキーの権限を確認

### Stripe Webhookエラー

1. Webhook署名シークレットを確認
2. エンドポイントURLが正しいか確認
3. イベントタイプが登録されているか確認

### ML機能が動作しない

1. フィーチャーフラグを確認：
```sql
SELECT * FROM feature_flags WHERE key LIKE '%ml%';
```

2. モック版を使用：
```env
USE_MOCK_ML=true
```

## メンテナンス

### 定期的なタスク

- [ ] 週次: バックアップの確認
- [ ] 月次: ストレージ使用量の確認
- [ ] 月次: エラーログの確認
- [ ] 四半期: 依存関係の更新

### モニタリング

1. Vercel Analytics でパフォーマンスを監視
2. Supabase Dashboard で使用量を監視
3. Stripe Dashboard で売上を監視

## サポート

問題が発生した場合：

1. [GitHub Issues](https://github.com/yourusername/mixai/issues)
2. エラーログを確認：
   - Vercel: Functions > Logs
   - Supabase: Logs > API Logs
3. 環境変数の再確認

## 次のステップ

デプロイが完了したら：

1. **本番データの投入**
   - サンプル音声をアップロード
   - テストユーザーを作成

2. **ML機能の有効化**
   - 十分なデータが集まったら段階的に有効化
   - A/Bテストで効果を測定

3. **カスタマイズ**
   - ロゴやブランディングの変更
   - 価格設定の調整
   - メール通知の設定

---

最終更新: 2025年1月10日