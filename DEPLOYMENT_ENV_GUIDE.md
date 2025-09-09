# MIXAI デプロイ環境変数設定ガイド

## 必須の環境変数

Vercelやその他のホスティングサービスにデプロイする際に設定が必要な環境変数です。

### 1. Supabase関連（必須）

```bash
# Supabaseダッシュボード → Settings → API から取得
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...（長い文字列）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...（サービスロールキー - 秘密）
```

### 2. NextAuth関連（必須）

```bash
# 認証用URL（本番ドメイン）
NEXTAUTH_URL=https://your-domain.com

# ランダムな文字列を生成（以下のコマンドで生成可能）
# openssl rand -base64 32
NEXTAUTH_SECRET=ランダムな32文字以上の文字列
```

### 3. Stripe関連（決済機能を使う場合）

```bash
# Stripeダッシュボード → 開発者 → APIキー
STRIPE_SECRET_KEY=sk_live_...（本番環境）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Webhook設定後に取得
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. アプリケーション基本設定

```bash
# 本番URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# アプリ名
NEXT_PUBLIC_APP_NAME=MIXAI

# サポートメール
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.com
```

### 5. 管理機能用（オプション）

```bash
# 管理者機能のセキュリティ
MFA_ISSUER=MIXAI
ADMIN_ALLOWED_IPS=（IPアドレスをカンマ区切り - オプション）

# Slack通知（オプション）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL_OPS=#mixai-ops-alerts
SLACK_CHANNEL_ADMIN=#mixai-admin
```

### 6. 監視・ログ（オプション）

```bash
# Sentry（エラー監視）
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...

# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## Vercelでの設定方法

### 1. Vercelダッシュボードから設定

1. プロジェクトを選択
2. Settings → Environment Variables
3. 各環境変数を追加
   - Key: 環境変数名
   - Value: 値
   - Environment: Production / Preview / Development を選択

### 2. Vercel CLIから設定

```bash
# Vercel CLIをインストール
npm i -g vercel

# ログイン
vercel login

# 環境変数を設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... 他の環境変数も同様に
```

### 3. .env.production.localファイルから一括設定

```bash
# 本番環境変数をプル（バックアップ）
vercel env pull .env.production.local

# 環境変数をプッシュ
vercel env push .env.production.local
```

## セキュリティ上の注意

### 絶対に公開してはいけない変数

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXTAUTH_SECRET`
- `SLACK_WEBHOOK_URL`
- `SENTRY_AUTH_TOKEN`

### クライアント側で使用可能な変数

`NEXT_PUBLIC_`プレフィックスが付いているものはクライアント側で使用可能です：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## 環境別の設定

### 開発環境（Development）

```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### ステージング環境（Preview）

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.your-domain.com
```

### 本番環境（Production）

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## トラブルシューティング

### 環境変数が反映されない場合

1. Vercelの場合、デプロイし直す
2. ローカルの場合、サーバーを再起動
3. `.env.local`より`.env.production.local`が優先される

### Supabaseの接続エラー

- URLとキーが正しいか確認
- RLSポリシーが適切に設定されているか確認
- Service Roleキーはサーバーサイドのみで使用

### Stripeの決済エラー

- 本番環境では`sk_live_`、テスト環境では`sk_test_`を使用
- Webhookエンドポイントが正しく設定されているか確認

## 必要最小限の環境変数（MVPの場合）

最小限動作させるために必要な環境変数：

```bash
# Supabase（必須）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth（必須）
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# アプリ設定（必須）
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=MIXAI
```

## 環境変数の生成コマンド

```bash
# ランダムシークレットの生成
openssl rand -base64 32

# Node.jsでの生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# UUIDの生成
npx uuid
```