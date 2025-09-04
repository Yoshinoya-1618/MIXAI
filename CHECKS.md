# CHECKS — うた整音（Uta Seion）DoD チェックリスト

本リポジトリに対して実装済み/未実装を整理したチェックリストです。

## UI / Frontend
- [x] `/` トップ：Hero/CTA・要点・注意・法務リンク（契約準拠、絵文字/過度演出なし）
- [x] `/upload`：2ファイル入力（WAV/MP3）・サイズ検証（簡易）・`aria-live` 進捗
- [x] `/preview`：15秒試聴モック、推定オフセット表示、料金、Suspense 対応
- [x] `/checkout`：同意チェック、Idempotency-Key 付き決済呼び出し、Suspense 対応
- [x] `/status/:id`：ポーリングで `uploaded → paid → processing → done|failed`、失敗時±2000msスライダー（モック）
- [x] `/result/:id`：署名URL取得（mp3/wav）、試聴/ダウンロード、クレジット表記テンプレ
- [x] `/help`・`/contact`・`/legal/{terms,privacy,rights}`：文面整備（禁止事項/保存期間/法務）
- [x] `app/layout.tsx`：メタ情報集約（`%s｜うた整音`、説明文）、`globals.css` 取込、`lang=ja`
- [x] `globals.css`：AAコントラスト志向・フォーカス可視化
- [ ] アクセシビリティ/E2Eでの網羅検証（現状は方針準拠＆実装反映のみ）

## API（Next.js Route Handlers）
- [x] `POST /v1/jobs`：ジョブ作成（RLS下で本人として行う）
- [x] `GET /v1/jobs/:id`：状態/パラメータ取得
- [x] `PATCH /v1/jobs/:id/files`：直アップロード後のパス確定（パス規約検証）
- [x] `POST /v1/jobs/:id/pay`：決済モック（Idempotency-Key 対応）→ `paid` 反映
- [x] `POST /v1/jobs/:id/render`：`processing` へ遷移（ワーカー実行のトリガ）
- [x] `GET /v1/jobs/:id/download?format=mp3|wav`：署名URL生成（TTL=環境変数）
- [x] `POST /v1/webhooks/payment`：`Payment-Secret` 検証→`paid` 反映
- [x] エラー形式 `{ code, message, details? }` に統一
- [x] **強化されたエラーハンドリング**（413/429/500対応、handleApiError実装）
- [x] **サーバーサイドファイル検証**（拡張子・MIME・サイズのZod検証）
- [x] **Webhook Idempotency処理**（重複処理防止）
- [x] **基本的なJestテスト実装**（API・エラーハンドリング・レート制限）
- [x] **レート制限の全APIへの適用**（jobs/pay/renderエンドポイント）
- [x] **CORS設定とセキュリティヘッダー**（middleware.ts）

## Storage / Supabase
- [x] SQL 定義：`supabase/sql/jobs_schema.sql`（jobs/RLS）
- [x] SQL 定義：`supabase/sql/storage_policies.sql`（uta-uploads/uta-results バケット + RLS）
- [x] パス規約：`users/{uid}/jobs/{job_id}/…`（APIで検証）
- [x] ダウンロードは署名URLのみ（結果バケットは読取のみ）
- [ ] Supabase 本番環境での実適用（バケット作成/RLS反映）
- [x] **7日自動削除Edge Function完全実装**（cleanup-expired/index.ts + cronスケジュール設定）

## Payments
- [x] 決済モジュールのスタブ（`payments/`）
- [x] Webhook 実装（シークレットヘッダ検証、Service Roleで更新）
- [x] **実決済プロバイダ（Stripe）完全統合**
- [x] **Stripe Webhook署名検証**（`payment_intent.succeeded/failed`対応）
- [x] **冪等性強化**（専用テーブル + upsert処理）
- [x] **決済エラーハンドリング**（Stripe例外捕捉）
- [ ] 失敗/返金フローのサンドボックス再現

## Worker（Node + FFmpeg (+Python 任意)）
- [x] スケルトン：`worker/index.ts`・`poller.ts`・`db.ts`（`processing` → `done` のモック）
- [x] Service Roleで結果を `uta-results` にアップロード（モックの空データ）
- [x] **実処理完全実装**：原稿DL→オフセット検出→FFmpeg合成（指定フィルタ）→UL→jobs更新
- [x] **`true_peak` 測定/保存**、オフセット検出（簡易版）
- [x] **`worker/audio.ts`**: 完全なFFmpeg処理パイプライン
- [x] **エラーハンドリング**: 失敗時の`markFailed`処理
- [x] **一時ファイル管理**: 自動クリーンアップ機能

## Security & Compliance
- [x] 署名URL TTL を環境変数で設定（`SIGNED_URL_TTL_SEC`）
- [x] UIでの禁止事項明記（DRM/保存期間/法的助言なし）
- [ ] サーバ側の拡張子/MIME/長さ/サイズ検証の実装
- [ ] レート制限/CORS最小化の適用
- [ ] 決済系のCSRF/Idempotency強化

## OpenAPI / 契約
- [x] `openapi.yaml`：主要エンドポイントと Job スキーマ定義
- [x] `instrumental_path`/`vocal_path` を nullable に整合
- [ ] OpenAPI からのコントラクトテスト/スキーマバリデーション連携

## Analytics
- [x] `landing_cta_upload_clicked` / `landing_cta_help_clicked`（相関ID付き・クライアントスタブ）
- [ ] サーバサイドイベントの蓄積・可視化

## QA & CI
- [ ] Unit/Integration/E2E テスト（Jest/Playwright）
- [ ] GitHub Actions（lint→test→e2e）
- [ ] フィクスチャ（30s/60s/61s超/偽装MIME/20MB超/無音/クリップ）

## Ops & Schedules
- [x] **Docker/compose完全設定**（Dockerfile, docker-compose.yml, healthcheck）
- [x] **ヘルスチェックAPI実装**（/api/health）
- [x] **7日削除スケジュール完了**（Edge Function + Supabase Cron設定）

## その他の整備
- [x] `postcss.config.cjs`（ESM 環境対応）
- [x] `useSearchParams()` 使用ページを Suspense でラップ（/preview, /checkout）

