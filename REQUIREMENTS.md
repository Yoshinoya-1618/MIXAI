REQUIREMENTS.md — うた整音（Uta Seion）/ Next.js + Supabase + npm

本要件は AGENTS.md の方針を反映した最新版です。
重要：実装に伴い Supabase 側で実行する SQL・RLS 変更・バケット/スケジュール追加 などが発生した場合、実装後に必ず本書末尾「Supabase追加作業ログ（運用ルール）」に追記してください。

1. 製品概要

目的：歌い手が 伴奏2mix + ボーカル1本（各≤60秒） をアップロードすると、AI処理（自動頭出し・軽いテンポ補正・MIX/マスタリング）を行い、ショート向け完成音源を即ダウンロードできる。

主要価値：最短操作、安心できる実務的UI、軽い都度課金で“今すぐ仕上げ”を実現。

対象プラットフォーム：Web（モバイル優先・レスポンシブ）。

技術スタック：Next.js（App Router）＋ Supabase（Auth/DB/Storage/RLS/Edge Functions）＋ 外部 Worker（Node + FFmpeg、任意で Python）。

2. スコープ（MVP）
入力

伴奏：WAV/MP3、≤60秒、≤20MB

ボーカル：WAV 推奨/MP3 可、≤60秒、≤20MB

自動処理（MVP）

頭出し（オフセット）：相互相関等で自動検出

軽いテンポ補正：±3% 以内（ボーカル側）

ボーカル処理：HPF(80–100Hz)、De-Esser、軽コンプ

伴奏処理：歌唱区間のみ 1–3dB の薄いダッキング

マスタリング：−14 LUFS / −1 dBTP を目標に正規化

出力：MP3 320kbps（既定）／ WAV 16-bit（任意）

非対応（次段候補）

ピッチ補正、音節単位タイムワープ、複数ボーカルの自動アライン、高度マルチバンド/EQマッチ高度版。

3. 人物像とユースケース（要約）

主ペルソナ：歌ってみた投稿者・配信者。短尺（〜60秒）をすぐ仕上げたい。

代表的フロー：アップロード → プレビュー確認 → 都度課金 → 処理状況の確認 → ダウンロード。

4. 情報設計 / ルーティング
/                 （ランディング）
/upload           （2ファイル投入 + 権利チェック）
/preview          （15秒プレビュー + 推定オフセット表示）
/checkout         （明細と同意、二重送信防止）
/status/:jobId    （uploaded → paid → processing → done|failed）
/result/:jobId    （試聴 + MP3/WAV ダウンロード + クレジット表記例）
/help             （使い方・FAQ）
/legal/terms, /legal/privacy, /legal/rights
/contact

5. UI 要件（“AIっぽいUI”禁止）

スタイル契約（厳守）

禁止：ガラスモーフィズム、強いネオン/発光、巨大角丸、ロボット/魔法表現、絵文字、過剰なスケルトン演出、曖昧/誇張コピー。

推奨：実務的UI（8px グリッド、角丸 4–8px、最小限の影、落ち着いたアクセント 1 色、AA コントラスト）。コピーは動詞ベースの短文。

アクセシビリティ：キーボード完結、フォーカス可視、aria-live で進捗告知、音声プレイヤーに適切ラベル。

/upload

ドロップゾーン ×2（伴奏/ボーカル）。受理条件（WAV/MP3・60秒・20MB）を明記。

権利チェック必須：「DRM/市販カラオケ音源はアップロードしません。権利確認は自己責任です。」

条件未充足時は 「プレビューを作成」 ボタンを無効。

/preview

15秒プレビュー、推定オフセット表示、料金（例：¥150）と処理目安（1–2分）。

「処理を開始」「戻る」。

/checkout

明細、同意チェック、二重送信防止、支払い確定で /status/:jobId へ。

/status/:jobId

ステップバッジ・進捗バー・残り時間目安（擬似可）。

失敗時のみ ±2000ms 手動頭出しスライダーと再試行ボタン（無料）。

/result/:jobId

試聴、MP3/WAV ダウンロード、クレジット表記テンプレのコピー領域。

再レンダー/新規プロジェクト導線。

6. API 仕様（REST / OpenAPI First）

POST /v1/jobs：ジョブ作成（DB 行作成、アップロード先情報を返す）

PATCH /v1/jobs/:id/files：instrumental_path/vocal_path を確定

POST /v1/jobs/:id/pay：都度課金（成功時のみ render 許可）

POST /v1/jobs/:id/render：処理開始（status=processing に更新）

GET /v1/jobs/:id：現在状態とメタ（offset_ms, atempo 等）

GET /v1/jobs/:id/download?format=mp3|wav：署名 URL を返す

POST /v1/webhooks/payment：決済 Webhook（成功/失敗/返金、idempotency）

エラー形式：{ code, message, details? } 統一。
認証：Supabase Auth（authenticated 前提）。匿名運用はしない。

7. データモデル（Supabase / SQL 概要）
create type job_status as enum ('uploaded','paid','processing','done','failed');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status job_status not null default 'uploaded',
  instrumental_path text not null,
  vocal_path         text not null,
  result_path        text,
  offset_ms          integer,
  atempo             numeric,
  target_lufs        numeric not null default -14,
  true_peak          numeric,
  error              text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_jobs_updated on public.jobs;
create trigger trg_jobs_updated before update on public.jobs
for each row execute function public.set_updated_at();

-- RLS
alter table public.jobs enable row level security;
create policy "jobs_select_own" on public.jobs for select using (auth.uid() = user_id);
create policy "jobs_insert_self" on public.jobs for insert with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs for update using (auth.uid() = user_id);

8. ストレージ設計（Supabase Storage / private）

バケット：uta-uploads（原稿）、uta-results（結果）— いずれも private。

推奨パス：users/{auth.uid}/jobs/{job_id}/…

RLS（storage.objects）例：

uta-uploads：自分の users/{uid}/… に対して read/insert/update を許可。

uta-results：自分の users/{uid}/… に対して read のみ。write は Service Role（Worker） のみ。

配布は 署名 URL のみ。公開リンクは使用しない。

9. Worker 要件（Node + FFmpeg、Python 任意）

処理：原稿 DL → オフセット検出（例：librosa） → FFmpeg 合成 → 結果 UL → jobs 更新。

FFmpeg 概念チェーン：

[vocal] highpass→de-esser→compressor → (adelay) →
[inst]  aresample→(adelay) →
sidechaincompress（1–3dB）→
aloudnorm（I=-14, TP=-1, LRA=11）


テンポ補正：必要時のみボーカル側へ atempo=0.97–1.03。

出力：result_path、offset_ms、atempo、true_peak（任意）。

失敗時：status=failed とせず、UI に 手動スライダーを提示して無料再試行可能に（課金は 1 回のみ）。

10. 課金要件

都度課金（例：¥150/曲）。

成功時のみ /render へ遷移可。重複課金防止（Idempotency-Key）。

失敗時：自動返金または無料再試行を明記（UI/メール）。

11. 非機能要件（品質目標）

性能：60秒素材の 95% を 120秒以内 に処理完了（標準インスタンス）。

信頼性：成功率 ≥ 98%（再試行含む）。

セキュリティ：拡張子/MIME/秒数/サイズ検証、レート制限、CORS 最小化、CSRF（決済周辺）、署名 URL TTL=300 秒。

アクセシビリティ：WCAG 2.1 AA、キーボード完結。

保管：7日で自動削除（Edge Function or 外部 cron）。

12. 法務・信頼

権利注意：DRM/市販カラオケ音源アップロードの禁止、権利確認はユーザー責任、法的助言は行わない旨。

公開ホスティングなし、DLは署名 URL のみ。

通報窓口：権利侵害申し立てフォームを /legal/rights からリンク。

13. 監視・計測（KPI/イベント）

イベント：upload_started/failed/succeeded, preview_ready, checkout_viewed, payment_succeeded/failed, job_enqueued, job_completed/failed, download_clicked（相関 ID 付与）。

KPI：完走率、平均処理時間、失敗率、返金率、1 人当たり課金回数。

14. 受け入れ基準（Acceptance）

≤60秒/≤20MB ×2 ファイル → 権利チェック → プレビュー → 決済 → 処理 → MP3/WAV DL が 3 分以内に完走。

出力は −14 LUFS（±0.5）/ True Peak ≤ −1 dBTP。

自動頭出し失敗時、±2000ms スライダーで無料再試行が成功。

UI は キーボードのみで操作完了、絵文字/AI風演出なし。

異常（形式/サイズ/秒数/決済失敗）で具体的メッセージと再試行導線が表示。

15. 環境変数（例）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYMENT_PROVIDER=stripe
PAYMENT_SECRET=

MAX_DURATION_SEC=60
MAX_FILE_MB=20
SIGNED_URL_TTL_SEC=300
RETENTION_DAYS=7

16. 実装時の注意（落とし穴対策）

重い音声処理は Next.js API では実行しない。Worker（常駐）へ委譲。

クライアント → Supabase Storage 直アップロード を基本とし、RLS とパス規約で制御。

すべて private。公開 URL は使わず 署名 URL のみ。

RLS 不備は致命的：DB と Storage の両方で自ユーザーのみ操作可を確認。

7日削除のスケジュール実装を忘れない（完了後は本書末尾へ記載）。

17. 参考：検出/合成の閾値（初期値の目安）

オフセット検出：onset 強度の相互相関最大点 → ±10ms 以内を目標。

De-Esser：i≈6（素材により ±2 dB）

Compressor：threshold -18dB, ratio 2:1, attack 15ms, release 120ms

ダッキング：threshold -20dB, ratio 2:1, mix 0.7

Loudness：aloudnorm I=-14, TP=-1, LRA=11

18. Supabase追加作業ログ（運用ルール）

規則：実装中に Supabase 側の追加作業（SQL/ポリシー/関数/スケジュール/バケット設定 等）が発生した場合、本セクションに必ず追記してください（日時・担当・変更点・理由を簡潔に）。

2025-09-__ / 担当: __

変更：uta-uploads / uta-results バケット作成（private）

変更：storage.objects RLS ポリシー適用（自分のパスのみ read/write、results は read のみ）

理由：個人領域以外のアクセス遮断

2025-09-__ / 担当: __

変更：Edge Function cleanup-expired 作成、RETENTION_DAYS=7 で古いオブジェクト削除（毎日 03:00 JST）

理由：保管期間遵守とコスト削減

2025-09-__ / 担当: __

変更：jobs.true_peak numeric 追記（品質監視）

理由：出力ピークの可観測性向上

以上。本要件に準拠し、AGENTS.md に沿ってタスクを進めてください。Supabase 側の追加作業は 必ず本書 18 章を最新化してください。