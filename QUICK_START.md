# MIXAI クイックスタートガイド

## 🚀 5分でMIXAIを起動する

### ステップ1: クローンと依存関係のインストール
```bash
# リポジトリをクローン
git clone https://github.com/yourusername/mixai.git
cd mixai

# 依存関係をインストール
npm install
```

### ステップ2: 環境変数の設定
```bash
# 環境変数ファイルをコピー
cp .env.example .env.local

# .env.localを編集して必要な値を設定
# 最低限必要な設定：
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### ステップ3: データベースのセットアップ
```bash
# Supabase CLIがインストールされている場合
supabase db push

# またはSupabase DashboardのSQL Editorで
# supabase/migrations/内のSQLファイルを順番に実行
```

### ステップ4: 開発サーバーの起動
```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 📋 必須の設定項目

### Supabase（必須）
1. https://app.supabase.com で新規プロジェクト作成
2. Settings > API から以下を取得：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY`

### Stripe（決済機能を使う場合）
1. https://dashboard.stripe.com でAPIキーを取得
2. 商品と価格を作成
3. Webhookエンドポイントを設定

## 🎯 初回起動時の確認ポイント

### ✅ 基本機能
- [ ] トップページが表示される
- [ ] サインアップ/ログインができる
- [ ] ファイルアップロードができる
- [ ] MIX処理が実行される

### ⚙️ 管理者設定（オプション）
```sql
-- 自分を管理者にする（Supabase SQL Editorで実行）
UPDATE profiles 
SET roles = 'admin' 
WHERE email = 'your-email@example.com';
```

管理画面: http://localhost:3000/admin

## 🔧 よくある問題と解決方法

### ビルドエラー
```bash
# TypeScriptエラーの場合
npm run build -- --no-lint

# 依存関係の問題
rm -rf node_modules .next
npm install
```

### データベース接続エラー
- Supabase URLとキーを再確認
- `.env.local`ファイルが正しく設定されているか確認

### ML機能を使いたい場合
```env
# .env.localに追加（初期はモック版を使用）
USE_MOCK_ML=true
ENABLE_CPU_ML=false
```

## 📚 次のステップ

1. **本番環境へのデプロイ**
   - [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)を参照

2. **機能のカスタマイズ**
   - 価格設定: `supabase/migrations/006_update_pricing_and_credits.sql`
   - プラン内容: `app/pricing/page.tsx`

3. **AI/ML機能の有効化**
   - [README_ML.md](./README_ML.md)を参照
   - 管理画面からフィーチャーフラグで制御

## 🆘 ヘルプ

- [GitHub Issues](https://github.com/yourusername/mixai/issues)
- [ドキュメント一覧](./docs/)
- エラーログ: ブラウザのコンソールとターミナルを確認

---

Happy Mixing! 🎵