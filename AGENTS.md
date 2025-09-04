AGENTS.md — うた整音（Uta Seion）/ Next.js + Supabase（npm）実装要件定義

本ドキュメントは Next.js（App Router）+ Supabase + npm を前提に、役割別の実装要件・入出力・完了基準（DoD）・Supabase設定（SQL/RLS/Storage）を完全定義します。
重要ルール：実装に伴い Supabase 側で行う追加の SQL・権限変更・バケット/ポリシー調整・スケジュール実行 等が発生した場合、実装後に必ず本ファイル末尾「Supabase追加作業ログ」へ追記してください（内容と理由を簡潔に）。

0) プロダクト概要 / MVP範囲

サイト名：うた整音（Uta Seion）

目的：歌い手が 伴奏2mix + ボーカル1本（≤60秒） をアップロード → 自動頭出し（オフセット） ＋ 軽いテンポ補正（±3%） ＋ MIX/マスタリング → ショート向け完成音源をDL。

入出力

入力：WAV/MP3、各 ≤60秒 / ≤20MB

出力：MP3 320kbps（既定）／WAV 16-bit（任意）、-14 LUFS / -1 dBTP

保存：Storage は private、7日で自動削除（スケジュール実装）

課金：都度課金（例 ¥150/曲、成功時のみ確定）

MVP外：ピッチ補正、音節ワープ、複数ボーカル自動アライン、高度マルチバンド

1) 非機能・法務・UIスタイル契約

パフォーマンス：60秒素材の95%を 120秒以内に処理

アクセシビリティ：WCAG 2.1 AA、キーボード完結

法務

DRM/市販カラオケ音源のアップロード禁止（必須チェック）

法的助言は行わない旨を明記

利用規約・プライバシー・権利ポリシー・通報フォーム常設

スタイル契約（“AIっぽさ”禁止）

禁止：ガラスモーフィズム／強ネオングラデ／発光・浮遊／巨大角丸／AIロボ系アイコン／誇張コピー／絵文字

推奨：実務的UI、8pxグリッド、角丸4–8px、最小限の影、落ち着いた1色アクセント、動詞ベースのコピー

2) アーキテクチャ / ディレクトリ / 依存

フロント：Next.js（App Router）+ Tailwind、i18n=ja、状態管理は最小

バックエンド：Next.js Route Handlers（軽処理/署名URL/状態API）、重いオーディオ処理は外部ワーカー（Node + FFmpeg + Python(任意)）

Supabase：Auth/DB/Storage/RLS、Edge Functions（任意：定期削除）、Webhooks（決済）

キュー：最小構成では DB ポーリング or Webhook トリガ（BullMQは任意）

/app
  /api                 # Next.js API（軽処理）
  /web                 # UI
  /audio               # 検出・合成ラッパ（Worker側で使用）
  /worker              # Node worker（FFmpeg呼出）
  /payments            # 決済モジュール
  /storage             # Supabase Storageラッパ
  /security            # 検証・レート制限
  /tests               # ユニット/E2E
  /deploy              # Docker/compose
  openapi.yaml
  AGENTS.md
  STYLE_CONTRACT.md


Node：v20 LTS 推奨

npm 主要依存：next react react-dom @supabase/supabase-js zod
Worker：execa ffmpeg-static（＋任意で Python/librosa 併用）

3) ルーティング / 主要フロー（UIのみ要約）

/ → /upload → /preview → /checkout → /status/:id → /result/:id

/upload：伴奏/ボーカルのDropzone×2、WAV/MP3・60秒・20MB・権利チェック必須

/preview：15秒試聴（モック可）、推定オフセット表示、料金と処理目安

/checkout：明細・同意・二重送信防止

/status/:id：uploaded → paid → processing → done|failed、失敗時のみ±2000msスライダーで再試行

/result/:id：試聴、MP3/WAVダウンロード、クレジット表記テンプレ表示

4) Supabase 設計（DB/Storage/RLS/スケジュール）
4.1 DB スキーマ（SQL：必須）
-- 型
create type job_status as enum ('uploaded','paid','processing','done','failed');

-- テーブル
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status job_status not null default 'uploaded',

  instrumental_path text not null, -- storage path (uta-uploads/users/{uid}/jobs/{id}/inst.ext)
  vocal_path         text not null, -- storage path (uta-uploads/users/{uid}/jobs/{id}/vocal.ext)
  result_path        text,          -- storage path (uta-results/users/{uid}/jobs/{id}/out.mp3)

  offset_ms          integer,
  atempo             numeric,
  target_lufs        numeric not null default -14,
  true_peak          numeric,
  error              text,

  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- 更新トリガ
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_jobs_updated on public.jobs;
create trigger trg_jobs_updated before update on public.jobs
for each row execute function public.set_updated_at();

-- RLS
alter table public.jobs enable row level security;

create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);

create policy "jobs_insert_self" on public.jobs
  for insert with check (auth.uid() = user_id);

create policy "jobs_update_own" on public.jobs
  for update using (auth.uid() = user_id);


実装メモ：instrumental_path/vocal_path は クライアント直アップロード後にPATCH で確定。result_path は Worker がアップロード完了後に更新。

4.2 Storage バケット（private）

uta-uploads（ユーザーが直アップロードする原稿格納、private）

uta-results（Workerのみ書込、ユーザーは自分の結果だけ読取、private）

推奨パス命名：users/{auth.uid}/jobs/{job_id}/…

4.3 Storage RLS（storage.objects ポリシー）
-- すべてprivate運用を前提に、個人パスに限定

-- 読取（自身のuploadsのみ）
create policy "read_own_uploads" on storage.objects
for select using (
  bucket_id = 'uta-uploads'
  and auth.role() = 'authenticated'
  and name like 'users/' || auth.uid()::text || '/%'
);

-- 書込（自身のuploadsのみ）
create policy "write_own_uploads" on storage.objects
for insert with check (
  bucket_id = 'uta-uploads'
  and auth.role() = 'authenticated'
  and name like 'users/' || auth.uid()::text || '/%'
);
create policy "update_own_uploads" on storage.objects
for update using (
  bucket_id = 'uta-uploads'
  and auth.role() = 'authenticated'
  and name like 'users/' || auth.uid()::text || '/%'
);

-- 結果（uta-results）はユーザー読み取りのみ、書込はService Role（Worker）想定
create policy "read_own_results" on storage.objects
for select using (
  bucket_id = 'uta-results'
  and auth.role() = 'authenticated'
  and name like 'users/' || auth.uid()::text || '/%'
);

-- 挿入/更新ポリシーは作らない（= WorkerのService Roleでのみ可能）


注意：Storage バケットは publicにしない。配布は 署名URL のみ。

4.4 7日自動削除（スケジュール）

方法A：Supabase Edge Functions + Scheduled Triggers（推奨）

方法B：外部Workerの cron で list → 作成日時比較 → delete

実装後、採用方法・関数名・実行間隔を 「Supabase追加作業ログ」へ必ず記載。

5) API（OpenAPI first / REST 例）

POST /v1/jobs：ジョブ作成（DB行作成→アップロード先情報を返す）

PATCH /v1/jobs/:id/files：instrumental_path/vocal_path を確定

POST /v1/jobs/:id/pay：決済（成功時のみ render 許可）

POST /v1/jobs/:id/render：処理開始（status=processing）

GET /v1/jobs/:id：状態・パラメータ

GET /v1/jobs/:id/download?format=mp3|wav：署名URLを返す

POST /v1/webhooks/payment：決済Webhooks（idempotency）

エラー規約：{ code, message, details? } に統一

6) Worker（オーディオ処理）

処理：原稿DL → オフセット検出（Python librosa など or 自前）→ FFmpeg合成（highpass→de-esser→compressor→sidechaincompress→aloudnorm）→ 結果UL → jobs 更新

出力：result_path、offset_ms、atempo、true_peak（任意）、エラーログ

フォールバック：検出失敗時は failed にせず、UIで ±2000msスライダー に誘導（無料再試行）

7) 役割別エージェント（責務 / 入出力 / DoD / 指示）
7.0 Orchestrator

責務：依存順調整、PR統合、チェックリスト運用

出力：CHECKS.md（完了条件一覧）

DoD：各マイルストーンで依存ブロッカー0

指示：順序＝UI（モック）→ OpenAPI → APIスタブ → Storage/RLS → 決済 → Worker → 署名DL

7.1 Planner

責務：WBS/マイルストーン作成

出力：PLAN.md

DoD：各タスクに完了定義・担当・所要目安

7.2 UI/Frontend

責務：/upload→/result の画面、状態遷移、アクセシビリティ

入力：STYLE_CONTRACT.md, OpenAPI

DoD：絵文字/AI演出なし、AAコントラスト、キーボード完結、E2E緑

指示：data-testid 付与、aria-live="polite" で進捗告知

7.3 API（Next.js Route Handlers）

責務：上記REST実装、署名URL、入力検証、Idempotency

DoD：supertest 緑、OpenAPI準拠

指示：multipart受領は クライアント直Storage方針 のため最小に

7.4 Storage（Supabase）

責務：put/get/signedUrl のラッパ、バケット作成、RLS適用

DoD：E2Eで 直UL → 処理 → DL 成功

指示：4章のSQL/RLSを適用し、差分あれば「Supabase追加作業ログ」へ記載

7.5 Payments

責務：都度課金、Webhook、重複防止

DoD：サンドボックスで成功/失敗/返金を再現可能

指示：成功時のみ render 解放

7.6 Worker（Node + FFmpeg (+Python任意)）

責務：検出→合成→UL→jobs更新、失敗分類

DoD：-14 LUFS（±0.5）/ -1 dBTP、±10ms級の頭出し（正常素材）

指示：FFmpeg は ffmpeg-static + execa、Python 使う場合は requirements.txt を同梱

7.7 Security & Compliance

責務：拡張子/MIME/長さ/サイズ検証、レート制限、CORS最小化

DoD：偽装・超過・無音を確実拒否、429/413適切返却

指示：署名URL TTL=300秒、決済系はCSRF/Idempotency

7.8 QA & CI

責務：Unit/Integration/E2E、GitHub Actions

DoD：PRで lint→test→e2e 全緑

指示：Fixtures：30s/60s正常、61s超、偽装MIME、20MB超、無音、クリップ

7.9 Ops & Schedules

責務：Docker/compose、死活、メトリクス、7日削除

DoD：docker-compose up で起動、スケジュール稼働

指示：スケジュール詳細は 「Supabase追加作業ログ」 に記載

7.10 Copy/Legal

責務：日本語マイクロコピー、Terms/Privacy/Rights、通報文面

DoD：誇張なし・絵文字なし、禁止事項/保存期間明記

7.11 Analytics

責務：計測イベント（相関ID付き）

DoD：以下イベントが発火：
upload_started/failed/succeeded, preview_ready, checkout_viewed, payment_succeeded/failed, job_enqueued, job_completed/failed, download_clicked

8) 受け入れ基準（E2E）

≤60秒/≤20MB×2ファイル → 権利チェック → プレビュー → 決済 → 処理 → MP3/WAV DL が 3分以内完走

目標ラウドネス：-14 LUFS（±0.5）/ True Peak ≤ -1 dBTP

自動頭出し失敗時、±2000msスライダーで無料再試行が成功

UIはキーボード完結、絵文字/AI風演出なし

異常系（形式/サイズ/秒数/決済失敗）で具体メッセージと再試行導線

9) 環境変数（例）/ npm スクリプト

.env.local（例）

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

DATABASE_URL=...           # 任意（外部処理で使用）
REDIS_URL=...              # 任意（使用時）
PAYMENT_PROVIDER=stripe    # 例
PAYMENT_SECRET=...

MAX_DURATION_SEC=60
MAX_FILE_MB=20
SIGNED_URL_TTL_SEC=300
RETENTION_DAYS=7


package.json（抜粋）

{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "e2e": "playwright test",
    "worker": "tsx worker/index.ts"
  }
}

10) 実装上の要点（落とし穴対策）

重処理はNext.js APIに載せない（タイムアウト/メモリ）→ Workerへ

アップロードはクライアント→Supabase Storage 直（RLS+パス規約で制御）

すべてprivate、公開配布は 署名URLのみ

RLS不備は致命的：DB/Storage 両方のポリシーを適用・確認

7日削除を確実に（Edge Function or 外部cron）— 実装後にログへ記載

11) 追加：FFmpeg フィルタ（MVP概念）
[1:a]aresample=48000,highpass=f=90,adeesser=i=6,acompressor=threshold=-18dB:ratio=2:attack=15:release=120,adelay={V_OFFSET}|{V_OFFSET}[v];
[0:a]aresample=48000,adelay={I_OFFSET}|{I_OFFSET}[i];
[i][v]sidechaincompress=threshold=-20dB:ratio=2:attack=10:release=120:mix=0.7[mix];
[mix]aloudnorm=I=-14:TP=-1:LRA=11[out]


V_OFFSET/I_OFFSET は検出符号で片方のみ付与。atempo は±3%以内でボーカル側へ。

12) Supabase追加作業ログ（必ず更新）

規則：実装中に Supabase 側の追加作業（SQL/ポリシー/関数/スケジュール/バケット設定 等）が発生したら、下に箇条書きで追記してください（日時・担当・変更点・理由）。

2025-09-__ / 担当: __

変更：uta-uploads / uta-results バケット作成（private）

変更：storage.objects に RLS ポリシー4本を適用（本文 4.3 の通り）

理由：個人パス以外のアクセスを遮断するため

2025-09-__ / 担当: __

変更：Edge Function cleanup-expired 作成。RETENTION_DAYS=7 で古いオブジェクトを削除。スケジュール：毎日 03:00 JST

理由：ストレージ/権利/コスト対策

2025-09-__ / 担当: __

変更：jobs テーブルへ true_peak numeric 追加（測定値保存）

理由：品質監視のため

（このログは必ず最新化すること）

追補：トップページ（/）UI要件

目的
初回訪問から最短で「/upload」に進ませる。機能の要点と信頼情報を簡潔に提示。

レイアウト（上から順）

Header：左にロゴテキスト「うた整音」、右に「使い方」「お問い合わせ」

Hero セクション

H1：例「ショート（〜60秒）を、歌声そのまま整音」

説明文：例「伴奏とボーカルをアップするだけ。自動で頭出し・軽い整音・-14 LUFS に仕上げます。」

主CTA（Primary）：「アップロードに進む」 → /upload（data-testid="cta-upload"）

副CTA（Secondary）：「使い方を見る」 → /help

要点（3カラム）

「2ファイルをアップロード」

「自動で頭出し＋軽い整音」

「完成音源をダウンロード」

信頼・注意カード（3点）

「DRM/市販カラオケ音源はアップロード禁止」

「ファイルは7日以内に自動削除」

「法的助言は行いません」

使い方の流れ（横並び 3 ステップ）：アップロード → 処理 → ダウンロード

Footer：©表記、/legal/terms /legal/privacy /legal/rights、/contact

スタイル/トーン

絵文字・ネオングラデ・ガラス表現・ロボット/魔法表現は不可（既存スタイル契約に従う）

8px グリッド、角丸 4–8px、AA コントラスト、コピーは動詞ベースの短文

アクセシビリティ/SEO

H1/H2 の意味づけ、Hero CTA は aria-label 付与

すべてキーボード操作可、フォーカスリング可視

<title> と <meta name="description"> を設定（例：
タイトル「うた整音｜ショート向け自動MIX」、概要「伴奏とボーカルをアップロードするだけで自動整音。-14 LUFS で仕上げてダウンロード。」）

計測

クリックイベント：landing_cta_upload_clicked、landing_cta_help_clicked（相関ID付与）

受け入れ基準

キーボードのみで CTA まで到達・遷移できる

主CTAが視認性・コントラスト要件を満たす

/upload へ 1 クリックで遷移

トップページ内に禁止事項と保存期間が明記されている

以上。各エージェントは本要件に従い実装を進め、Supabase 側の追加作業が発生した場合は必ず本書末尾に追記してください。