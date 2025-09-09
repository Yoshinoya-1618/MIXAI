# 🎵 MIXAI v2.0 - AIパワード音声ミキシングプラットフォーム

[![Deployment Status](https://img.shields.io/badge/deployment-vercel-brightgreen)](https://vercel.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**歌声が、主役になる。** AI駆動の音声処理と機械学習で、プロフェッショナルなミキシングを自動化

## ✨ 主な機能

### コア機能
- 🎵 **AIミキシング**: 機械学習モデルによる自動パラメータ最適化
- 🤖 **CPU最適化ML**: ONNX Runtimeを使用したCPUベースの推論
- 🎯 **特徴量抽出**: スペクトル、時間、MFCC、クロマ、ラウドネス解析
- 🔄 **A/Bテスト**: 段階的なモデルロールアウトと効果測定
- 🎛️ **フィーチャーフラグ**: 機能の安全な段階的リリース

### ビジネス機能
- 💳 **サブスクリプション**: Lite/Standard/Creatorプラン
- 💰 **クレジットシステム**: 柔軟な従量課金とパック購入
- 📊 **管理ダッシュボード**: ユーザー管理、ジョブ監視、ML管理
- 📈 **分析・監視**: リアルタイムメトリクスとパフォーマンス追跡

## 🚀 クイックスタート

### 必要要件
- Node.js 20以上
- npm または yarn
- Supabaseアカウント
- Stripeアカウント（決済機能用）

### 開発環境セットアップ

```bash
# リポジトリクローン
git clone https://github.com/yourusername/mixai.git
cd mixai

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集して必要な値を設定

# データベースマイグレーション
npx supabase db push

# 開発サーバー起動
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

### Vercelへのデプロイ

```bash
# Vercel CLIを使用
npx vercel

# または GitHubと連携して自動デプロイ
```

詳細は[デプロイメントガイド](./DEPLOYMENT_GUIDE.md)を参照してください。

## 📋 環境変数

必要な環境変数の詳細は[.env.example](./.env.example)を参照してください。

### 必須設定
```env
# Supabase（必須）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe（必須）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### ML/AI設定（オプション）
```env
# ML機能の有効化
ENABLE_CPU_ML=false
ML_MIN_SAMPLES=1000
USE_MOCK_ML=true  # 開発時はモック使用
```

## 🏗️ アーキテクチャ

### 技術スタック
- **フロントエンド**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, Edge Functions
- **データベース**: Supabase (PostgreSQL with RLS)
- **認証**: Supabase Auth
- **決済**: Stripe (サブスクリプション + 従量課金)
- **ML/AI**: ONNX Runtime (CPU最適化), TensorFlow.js (モック)
- **音声処理**: FFmpeg, Web Audio API
- **デプロイ**: Vercel

### システム構成
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │────│    Supabase      │────│   ML Worker     │
│  (Frontend/API) │    │ (Auth/DB/Storage)│    │  (ONNX/FFmpeg)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐            │
         └──────────────│     Stripe       │────────────┘
                        │ (Payments/Billing)│
                        └──────────────────┘
```

## 🧪 開発とテスト

### ビルドチェック
```bash
# TypeScriptの型チェック
npx tsc --noEmit

# ESLintチェック
npm run lint

# ビルド
npm run build
```

### テスト実行
```bash
# 単体テスト
npm test

# E2Eテスト
npm run e2e
```

### ローカルVercelビルド検証
```bash
# Windows
scripts\vercel-local-build.bat

# Mac/Linux
bash scripts/vercel-local-build.sh
```

## 📊 管理・運用

### 管理ダッシュボード
- `/admin` - 管理者ダッシュボード
- `/admin/users` - ユーザー管理
- `/admin/jobs` - ジョブ監視
- `/admin/ml` - ML管理
- `/admin/flags` - フィーチャーフラグ

### APIエンドポイント
- `GET /api/health` - ヘルスチェック
- `GET /api/metrics` - メトリクス
- `POST /api/v1/mix/analyze` - 音声解析
- `POST /api/v1/ml/extract` - 特徴量抽出
- `POST /api/v1/ml/train` - モデル学習
- `POST /api/v1/ml/infer` - 推論実行

## 🔧 運用コマンド

### データベース管理
```bash
# マイグレーション実行
npx supabase db push

# マイグレーション状態確認
npx supabase db status
```

### ML管理
```bash
# 学習ジョブ実行（管理画面から）
curl -X POST /api/v1/ml/train \
  -H "Authorization: Bearer YOUR_TOKEN"

# モデルメトリクス確認
curl /api/v1/ml/metrics
```

### Vercelデプロイ
```bash
# 本番環境へデプロイ
npx vercel --prod

# プレビューデプロイ
npx vercel
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