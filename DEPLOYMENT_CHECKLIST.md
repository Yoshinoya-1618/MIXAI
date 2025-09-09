# 🚀 MIXAI 本番デプロイチェックリスト

## 📋 事前準備

### 1. 環境変数の設定
- [ ] `.env.local`ファイルを作成（`.env.example`を参考）
- [ ] Supabase認証情報を設定
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 認証関連の設定
  - [ ] `NEXTAUTH_URL`（本番URL）
  - [ ] `NEXTAUTH_SECRET`（安全なランダム文字列）
- [ ] Cron認証の設定
  - [ ] `CRON_SECRET`（安全なランダム文字列）
- [ ] Stripe決済の設定（本番キー）
  - [ ] `STRIPE_PUBLIC_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`

### 2. Supabaseセットアップ
- [ ] プロジェクトを作成
- [ ] データベースマイグレーションを実行
  ```bash
  npx supabase db push
  ```
- [ ] Edge Functionsをデプロイ
  ```bash
  npx supabase functions deploy expire-trials
  npx supabase functions deploy cleanup-expired-data
  ```
- [ ] ストレージバケットを作成
  - [ ] `audio-files`（プライベート）
  - [ ] `public`（公開）
  - [ ] `artifacts`（一時ファイル）
- [ ] RLSポリシーが有効になっていることを確認
- [ ] バックアップ設定を確認

### 3. Vercelセットアップ
- [ ] プロジェクトをインポート
- [ ] 環境変数を設定（Production）
- [ ] ドメインを設定
- [ ] SSL証明書が有効であることを確認
- [ ] Cron Jobsが設定されていることを確認
  - [ ] expire-trials（毎日2時）
  - [ ] cleanup-data（毎日3時）
  - [ ] release-holds（10分毎）

## 🔒 セキュリティチェック

### 1. 認証・認可
- [ ] すべての保護されたエンドポイントで認証チェック
- [ ] RLSポリシーが適切に設定されている
- [ ] APIキーが本番用に更新されている
- [ ] CORS設定が適切

### 2. データ保護
- [ ] 個人情報の暗号化
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] CSRF対策

### 3. セキュリティヘッダー
- [ ] Content Security Policy
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Strict-Transport-Security

## ⚡ パフォーマンスチェック

### 1. フロントエンド
- [ ] ビルド最適化が有効
  ```bash
  npm run build
  ```
- [ ] 画像最適化が有効
- [ ] コード分割が適切
- [ ] 不要なconsole.logを削除
- [ ] Lighthouseスコア確認（90以上目標）

### 2. バックエンド
- [ ] データベースインデックスが適切
- [ ] N+1クエリ問題がない
- [ ] キャッシュ戦略が適切
- [ ] レート制限が設定されている

## 🧪 テスト

### 1. 機能テスト
- [ ] ユーザー登録・ログイン
- [ ] ファイルアップロード
- [ ] テーマ選択
- [ ] MIX処理
- [ ] クレジット消費
- [ ] ダウンロード
- [ ] プラン変更

### 2. エラーハンドリング
- [ ] 404ページ
- [ ] 500ページ
- [ ] エラーバウンダリ
- [ ] APIエラーレスポンス

### 3. ブラウザテスト
- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge
- [ ] モバイルブラウザ

## 📊 モニタリング設定

### 1. エラー監視
- [ ] Sentryの設定（オプション）
- [ ] エラーログの収集
- [ ] アラート設定

### 2. パフォーマンス監視
- [ ] Vercel Analytics有効化
- [ ] Core Web Vitals監視
- [ ] APIレスポンスタイム監視

### 3. ビジネスメトリクス
- [ ] ユーザー登録数
- [ ] MIX処理数
- [ ] クレジット消費量
- [ ] エラー率

## 📝 ドキュメント

### 1. 運用ドキュメント
- [ ] README.mdが最新
- [ ] API仕様書
- [ ] データベース設計書
- [ ] 運用手順書

### 2. ユーザードキュメント
- [ ] 利用規約
- [ ] プライバシーポリシー
- [ ] 特定商取引法に基づく表記
- [ ] ヘルプページ

## 🚦 デプロイ手順

### 1. 最終確認
```bash
# ビルドテスト
npm run build

# 型チェック
npm run type-check

# リンターチェック
npm run lint

# テスト実行
npm run test
```

### 2. デプロイ実行
```bash
# Vercelデプロイ
vercel --prod

# Supabaseマイグレーション
npx supabase db push --db-url $DATABASE_URL

# Edge Functionsデプロイ
npx supabase functions deploy --project-ref $PROJECT_REF
```

### 3. デプロイ後確認
- [ ] トップページが表示される
- [ ] ログインができる
- [ ] APIヘルスチェック `/api/health`
- [ ] Cron Jobsが動作している
- [ ] エラーログを確認

## 🔄 ロールバック計画

### 問題が発生した場合
1. Vercelで前のデプロイに即座にロールバック
2. データベースバックアップから復元（必要な場合）
3. インシデントレポートを作成

## 📞 連絡先

### 緊急時連絡先
- 技術責任者: [連絡先]
- Supabaseサポート: [連絡先]
- Vercelサポート: [連絡先]

## ✅ 最終承認

- [ ] すべてのチェック項目が完了
- [ ] ステークホルダーの承認を取得
- [ ] デプロイ実行の承認

---

**デプロイ実施日時**: ____年____月____日 ____時____分
**実施者**: _______________
**承認者**: _______________