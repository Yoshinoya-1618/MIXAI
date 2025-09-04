# MIXAI - 歌声が、主役になる

[![Build Status](https://github.com/mixai/mixai/workflows/CI/badge.svg)](https://github.com/mixai/mixai/actions)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)](https://hub.docker.com/)
[![Next.js](https://img.shields.io/badge/next.js-%23000000.svg?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)

歌い手向けオンラインMIXサービス。伴奏と歌声をアップロードするだけで、AI技術によりピッチとタイミングを自然に補正。YouTube・TikTok等のショート動画にも最適。

## ✨ 主な機能

- 🎵 **高精度オフセット検出**: librosaを使用した本格的な相関解析
- 💳 **Stripe決済統合**: セキュアな都度課金システム
- 🗄️ **自動データ削除**: 7日経過後の自動クリーンアップ
- 🔒 **セキュリティ強化**: CORS最小化、CSP、レート制限
- 📊 **本格監視**: Prometheus + Grafana ダッシュボード
- ✅ **完全テスト**: Jest単体テスト + Playwright E2Eテスト

## 🚀 クイックスタート

### 開発環境

```bash
# リポジトリクローン
git clone https://github.com/mixai/mixai.git
cd mixai

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集してSupabaseとStripe設定を追加

# Python環境セットアップ（高度なオフセット検出用）
bash setup-python.sh

# 開発サーバー起動
npm run dev

# ワーカー起動（別ターミナル）
npm run worker
```

### 本番環境（Docker Compose）

```bash
# 環境変数設定
cp .env.example .env

# Docker Compose起動
docker-compose up -d

# 監視ダッシュボード
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
```

## 📋 環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe決済
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# アプリ制約
MAX_DURATION_SEC=60
MAX_FILE_MB=20
SIGNED_URL_TTL_SEC=300
RETENTION_DAYS=7
PRICE_JPY=150

# 監視（本番環境）
GRAFANA_PASSWORD=secure_password
```

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │────│  Supabase        │────│   Worker        │
│   (Frontend)    │    │  (Auth/DB/Storage│    │   (FFmpeg+AI)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐             │
         └──────────────│     Stripe       │─────────────┘
                        │   (Payments)     │
                        └──────────────────┘

監視: Prometheus + Grafana
インフラ: Docker + Nginx + Redis
```

## 🧪 テスト

```bash
# 単体テスト
npm test

# E2Eテスト
npm run e2e

# テストカバレッジ
npm run test:coverage
```

## 📊 監視・運用

### ヘルスチェック
```bash
curl http://localhost:3000/api/health
```

### メトリクス
```bash
curl http://localhost:3000/api/metrics
```

### ログ
```bash
docker-compose logs -f app
```

## 🔧 運用コマンド

```bash
# 本番デプロイ
docker-compose -f docker-compose.prod.yml up -d

# データベースマイグレーション
npx supabase db push

# 期限切れデータ削除（手動実行）
curl -X POST http://localhost:54321/functions/v1/cleanup-expired

# パフォーマンス監視
npm run lighthouse
```

## 📁 プロジェクト構造

```
mixai/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── v1/jobs/       # ジョブ管理API
│   │   ├── v1/webhooks/   # 決済Webhook
│   │   ├── health/        # ヘルスチェック
│   │   └── metrics/       # Prometheus メトリクス
│   ├── page.tsx           # メインページ
│   └── layout.tsx         # ルートレイアウト
├── worker/                # 音声処理ワーカー
│   ├── audio.ts           # FFmpeg処理
│   ├── advanced-offset.py # librosa相関解析
│   └── index.ts           # ワーカーメイン
├── payments/              # Stripe統合
├── supabase/             # Supabase設定
│   ├── functions/        # Edge Functions
│   └── migrations/       # データベース設計
├── monitoring/           # 監視設定
│   ├── prometheus.yml    # Prometheus設定
│   └── grafana/          # Grafana ダッシュボード
├── __tests__/            # 単体テスト
├── e2e/                  # E2Eテスト
└── docker-compose.yml    # Docker環境
```

## 🔐 セキュリティ

- **CORS最小化**: 厳格なOrigin制限
- **CSP**: Content Security Policy適用
- **レート制限**: IP別API制限
- **データ暗号化**: Supabase RLS適用
- **署名URL**: 期限付きファイルアクセス
- **依存関係**: 定期セキュリティ監査

## 📈 パフォーマンス

- **処理時間**: 60秒音声を120秒以内で処理
- **成功率**: ≥98%（再試行含む）
- **可用性**: 99.9%稼働目標
- **レスポンス**: P95 < 2秒

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. コミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🙋‍♂️ サポート

- 📖 [ドキュメント](./CLAUDE.md)
- 🐛 [Issue報告](https://github.com/mixai/mixai/issues)
- 💬 [Discord](https://discord.gg/mixai)
- 📧 [メール](mailto:support@mixai.app)

---

**MIXAI** で、あなたの歌声を最高の形で届けましょう 🎤✨