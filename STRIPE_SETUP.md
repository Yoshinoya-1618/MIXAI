# Stripe本番環境セットアップ手順

## 📋 必要な情報を収集

### 1. Stripeダッシュボードにログイン
https://dashboard.stripe.com/

### 2. 本番環境に切り替え
上部の「テスト環境」トグルを「本番環境」に切り替え

### 3. 以下の値を取得して`.env.production`に設定

## 🔑 APIキーの取得

```bash
# Stripeダッシュボード → 開発者 → APIキー

# 1. シークレットキー（バックエンド用）
STRIPE_SECRET_KEY=sk_live_xxxxxxxx

# 2. 公開可能キー（フロントエンド用）  
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx
```

## 💰 価格IDの取得

```bash
# Stripeダッシュボード → 商品カタログ → 各商品をクリック

# 各プランの価格IDをコピー
STRIPE_PRICE_LITE=price_xxxxxxxx        # Liteプラン ¥1,280
STRIPE_PRICE_STANDARD=price_xxxxxxxx    # Standardプラン ¥2,980
STRIPE_PRICE_CREATOR=price_xxxxxxxx     # Creatorプラン ¥5,980
STRIPE_PRICE_ADDON=price_xxxxxxxx       # 追加クレジット ¥300
```

## 🔔 Webhookの設定

### 1. Webhookエンドポイントを作成
```
Stripeダッシュボード → 開発者 → Webhooks → エンドポイントを追加

エンドポイントURL: https://[YOUR_DOMAIN]/api/webhooks/stripe
```

### 2. イベントを選択
以下のイベントにチェック:
- ✅ checkout.session.completed
- ✅ checkout.session.expired  
- ✅ customer.subscription.created
- ✅ customer.subscription.updated
- ✅ customer.subscription.deleted
- ✅ invoice.paid
- ✅ invoice.payment_failed

### 3. 署名シークレットを取得
```bash
# エンドポイント作成後、「署名シークレット」を表示してコピー
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
```

## 🌐 ドメイン設定

```bash
# 本番ドメインを設定
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# サポートメール
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
```

## 🔐 Supabaseパスワード

```bash
# Supabaseダッシュボード → Settings → Database
# データベースパスワードを取得
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.ebyuuufywvgghnsxdudi.supabase.co:5432/postgres
```

## 🚀 デプロイ前チェックリスト

- [ ] `.env.production`の全ての`[YOUR_xxx]`を実際の値に置換
- [ ] Stripe本番環境が有効化されている
- [ ] Webhookエンドポイントが設定されている
- [ ] SSL証明書が有効（HTTPS必須）
- [ ] 特定商取引法ページが公開されている
- [ ] プライバシーポリシーが最新
- [ ] 利用規約が最新

## 📝 環境変数の適用

### Vercelの場合
```bash
# Vercelダッシュボード → Settings → Environment Variables
# .env.productionの内容をProduction環境に設定
```

### 手動デプロイの場合
```bash
# 本番サーバーで
cp .env.production .env.local
npm run build
npm start
```

## ⚠️ 重要な注意事項

1. **`.env.production`をGitにコミットしない**
2. **本番APIキーは絶対に公開しない**
3. **Webhookシークレットは安全に管理**
4. **定期的にAPIキーをローテーション**

## 🧪 本番環境テスト

1. 少額（¥100等）でテスト購入
2. Customer Portalへのアクセス確認
3. Webhook受信確認（Stripeダッシュボードで確認）
4. 請求書発行確認
5. 解約フロー確認

## 📞 サポート

問題が発生した場合:
- Stripeサポート: https://support.stripe.com/
- Stripe日本語ドキュメント: https://stripe.com/docs/ja