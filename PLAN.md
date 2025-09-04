# PLAN — うた整音（Uta Seion）

## マイルストーンとWBS（MVP）

- M1: UIモックとナビゲーション（/→/upload→/result）
  - ページ雛形（App Router, Tailwind）
  - アクセシビリティ土台（フォーカス順・aria-live）
  - data-testid 付与
- M2: OpenAPI雛形とAPIスタブ
  - openapi.yaml 定義（/v1/jobs 系）
  - Next.js Route Handlers スタブ（501返却）
- M3: Supabase 設計適用
  - DB: jobs テーブル・enum・トリガ
  - RLS: jobs/Storage ポリシー
  - Storage: privateバケット設計（uta-uploads/uta-results）
- M4: Storage ラッパと署名URL
  - supabaseClient 初期化
  - put/get/signedUrl 雛形
- M5: Worker骨子（FFmpeg呼出スタブ）
  - フロー: DL→検出(スタブ)→合成(スタブ)→UL→jobs更新(スタブ)
- M6: Security & QA土台
  - 入力検証（zod 雛形）
  - エラー規約 {code,message,details?}
  - Jest/Playwright の最小スケルトン（次フェーズ）
- M7: 決済スタブ（次フェーズ）
  - Webhook/Idempotencyの骨子

## 依存関係
UI → OpenAPI → APIスタブ → Supabase(SQL/RLS) → Storage → Worker → 決済

## 完了定義（MVP）
- ≤60秒/≤20MB×2のUI制約・検証モック
- /v1/jobs系エンドポイントはOpenAPI準拠のスタブ応答
- Supabase SQL/RLSは適用可能なスクリプトとして提供
- Storageはprivate前提・署名URL発行の雛形
- Workerは実行フローの雛形とFFmpegコマンド方針を明記
