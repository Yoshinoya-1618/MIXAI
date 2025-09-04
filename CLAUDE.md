# CLAUDE.md — うた整音（Uta Seion）開発ガイド v1.2

## プロジェクト概要

歌い手が伴奏2mix + ボーカル1本（各 **≤60秒**）をアップロード → **AI処理**（自動頭出し・軽いテンポ補正・ボーカルMIX→instと合成→軽マスタリング）→ **ショート向け完成音源**を即ダウンロード。

**技術スタック**: Next.js（App Router）+ Supabase（Auth/DB/Storage/RLS/Edge Functions）+ 外部 Worker（Node + FFmpeg / Rubber Band、必要に応じて Python: librosa / CREPE / WORLD）

**課金**: 単体売り（都度課金）＋ サブスク（クレジット制）＋無料トライアル。**成功時のみ決済確定**（idempotency）。

**保存**: private、**7日で自動削除**、配布は**署名URLのみ**。

**対象**: Web（モバイル優先・レスポンシブ）。

---

## アーキテクチャ

```
フロント: Next.js (App Router, TS) + Tailwind
API:    Next.js Route Handlers（軽処理・受付のみ）
重処理: 外部 Node Worker（FFmpeg + Rubber Band + 任意でPython/Librosa/CREPE/WORLD）
DB/Auth/Storage: Supabase（RLS適用）
キュー: BullMQ/Redis（またはSupabase Jobs代替）
```

**方針**

* **instは基本いじらない**（BYPASS）。ボーカル整音→instと合成→2mixを軽マスタ。
* 例外として**ボーカルが埋もれる場合のみ**、サイドチェインで**瞬間的に -1～-1.5 dB 程度**下げる「Rescue」モードを使用。
* 自動解析で**声質/テンポ/ピッチ**を把握し、**プリセット選択＋微調整**へ反映。

---

## フロー（画面/遷移）

```
/                 （ランディング）
/upload           （2ファイル投入 + 権利・秒数チェック）
/preview          （15秒プレビュー + 推定オフセット表示）
/checkout         （明細と同意、二重送信防止）
/status/:jobId    （uploaded → paid → processing → done|failed）
/result/:jobId    （試聴 + MP3/WAVダウンロード + クレジット表記例）
/help             （使い方・FAQ）
/legal/terms, /legal/privacy, /legal/rights
/contact
```

---

## UIスタイル契約（厳守）

❌ **禁止**: ガラスモーフィズム、強ネオン/発光、巨大角丸、ロボット/魔法表現、**絵文字**、過剰スケルトン演出、曖昧・誇張コピー
✅ **推奨**: 実務的UI（8pxグリッド、角丸4–8px、最小限の影、落ち着いたアクセント1色、AAコントラスト）。文言は**動詞ベースの短文**。
アクセシビリティ: キーボード完結、フォーカス可視、aria-liveで進捗告知、音声プレイヤーに適切ラベル、**WCAG 2.1 AA**。

---

## セキュリティ

* すべて**private**。配布は\*\*署名URL（TTL=300s）\*\*のみ。
* RLS: 自ユーザーの行/パス以外は不可。Storageも同様に制限。
* 拡張子/MIME/**秒数**/サイズ検証、レート制限、CORS最小化、CSRF（決済周辺）。
* **DRM/市販カラオケ禁止**。権利確認はユーザー自己申告＋注意喚起。

---

## データモデル（RLS前提・最新版）

```sql
create type job_status as enum ('uploaded','paid','processing','done','failed');
create type inst_policy as enum ('bypass','safety','rescue');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status job_status not null default 'uploaded',

  -- 入力/出力
  instrumental_path text,
  vocal_path text,
  result_path text,
  out_format text default 'mp3',      -- 'mp3'|'wav'
  sample_rate int,                    -- 44100|48000
  bit_depth int,                      -- 16|24 (wav時)

  -- 解析/処理パラメータ
  plan_code text references public.plans(code),
  preset_key text,                    -- 'clean_light'等（12種）
  inst_policy inst_policy default 'bypass',
  micro_adjust jsonb,                 -- {forwardness, space, brightness}
  offset_ms integer,                  -- 自動頭出し結果
  atempo numeric,                     -- 例: 0.98～1.03
  tempo_map_applied boolean default false,
  rescue_applied boolean default false,

  -- メトリクス（Before/After）
  beat_dev_ms_before numeric,         -- 拍ズレ平均（ms）
  beat_dev_ms_after numeric,
  pitch_err_cent_before numeric,      -- ノート中心誤差（cent）
  pitch_err_cent_after numeric,
  hnr_before numeric,                 -- Harmonic-to-Noise Ratio
  hnr_after numeric,

  -- ラウドネス
  target_lufs numeric not null default -14,
  measured_lufs numeric,
  true_peak numeric,

  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- クレジット台帳
create type credit_event as enum ('grant','consume','purchase','rollback','expire');
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  event credit_event not null,
  credits numeric not null,               -- 正: 付与/購入、負: 消費
  reason text,
  job_id uuid references public.jobs(id),
  created_at timestamptz default now()
);

-- プラン＆サブスク
create table public.plans (
  code text primary key,                  -- 'lite'|'standard'|'creator'
  name text not null,
  price_jpy integer not null,
  monthly_credits numeric not null,
  created_at timestamptz default now()
);

create type sub_status as enum ('none','active','past_due','canceled');
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  plan_code text references public.plans(code),
  status sub_status not null default 'none',
  current_period_start timestamptz,
  current_period_end timestamptz,
  auto_renew boolean default true,
  auto_buy_addon boolean default true,   -- 残高不足時の自動追加購入
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

**Storage設計**

* `uta-uploads` : ユーザー直アップロード（private）
* `uta-results` : Worker専用書き込み（private）
* パス: `users/{uid}/jobs/{job_id}/...`

---

## プラン差別化（Lite / Standard / Creator）

**差別化の軸**: 仕上がりの選択肢（プリセット/微調整）・自動最適化の深さ・補正の粒度（テンポ/ピッチ）・inst扱い・運用快適さ・ハモリ機能。

### Lite（はじめて安心・失敗しない）

* **プリセット**: Basic 3種（Clean Light / Soft Room / Vocal Lift Lite）
* **微調整**: なし（固定値）
* **自動解析**: 軽量（声の明暗・シビランス・こもり）。**おすすめプリセット表示**まで
* **テンポ補正**: 一定比率（±3%上限）。可変テンポ（DTW）は **OFF**
* **ピッチ補正**: 「外れ1音」候補の**提示のみ**（自動適用OFF）
* **inst**: **BYPASS固定**（クリップ回避の安全トリムのみ）
* **ハモリ**: **上3度 / 下3度 / 5度**を生成・プレビュー可。**適用時 +0.5C**
* **運用**: 同時保存1／保持7日／通常優先度／A/B簡易指標

### Standard（週1の主力・選べる＋微調整）

* **プリセット**: Basic + Pop 計7種（Wide Pop / Warm Ballad / Rap Tight / Idol Bright 追加）
* **微調整**: **あり**（前後感／空間／明るさ）
* **自動解析**: 標準（スペクトル傾斜/シビランス/低中域過多/ノイズ）→ **自動プリセット選択＋微調整初期値**
* **テンポ補正**: **DTWベースの可変テンポ**（±4%上限）。**拍ズレ平均/分散の改善を確認**して適用
* **ピッチ補正**: 「外れ1音」を**自動検出→ワンタップ修正**（±40cent上限、フォルマント保持）
* **inst**: 既定 BYPASS。**Rescue（サイドチェイン）を手動ON可**
* **ハモリ**: **上3度 / 下3度 / 5度**を生成・プレビュー可。**適用1つ 0C（無料）**
* **運用**: 同時保存2／保持30日／**優先**／A/B詳細指標

### Creator（作品基準・安定高水準）

* **プリセット**: 全12種（Basic+Pop+Studio5：Studio Shine / Airy Sparkle / Live Stage / Vintage Warm / Night Chill）
* **微調整**: **高精度**（内部クリップ±15%、EQ補助ポイント追従）
* **自動解析**: 拡張（**声紋プロファイル保存**→次回の初期値に学習）／EQ/De-esser/Compの**微オフセット**反映
* **テンポ補正**: **DTW + テンポマップ**（Rubber Band適用）。**拍ズレ30%以上改善**しない場合は不採用
* **ピッチ補正**: 自動修正（±50cent上限、ランプ/ビブラート保持）＋ **WORLD再合成モード**選択可
* **inst**: 既定 BYPASS。**埋もれ度が閾値超**で**自動Rescue**（歌区間のみ軽く）
* **ハモリ**: **上3度 / 下3度 / 5度**を生成・プレビュー可。**適用1つ 0C（無料）**
* **運用**: 同時保存3／保持90日／**最優先**／プロ向けA/B（ヒートマップ、ノート別cent、HNR）

---

## MIXプリセット（12種）

**Basic（3）**: Clean Light / Soft Room / Vocal Lift Lite
**Pop（4）**: Wide Pop / Warm Ballad / Rap Tight / Idol Bright
**Studio（5）**: Studio Shine / Airy Sparkle / Live Stage / Vintage Warm / Night Chill

> 各プリセットは、Vocal: HPF→LPF→De-esser→Comp→ParamEQ→薄リバーブ → Mix(amix) → Loudness/Limit の順。instは既定**BYPASS**。詳細パラメータは実装ファイル参照（ffmpeg/equalizer, deesser, acompressor, aecho, loudnorm, alimiter）。

**微調整（Standard/Creator）**

* **前後感**: amixの vocalWeight/instWeight を±15%調整＋3.5k/12k帯の軽EQで補助
* **空間**: リバーブ decay を 0.00〜0.45 に線形割当（プリセットの質感は維持）
* **明るさ**: 3.5kHz と 12kHz 近傍を ±2.5dB でブースト/カット

---

## instポリシー

* **bypass（既定）**: inst無加工。必要時のみ安全トリム。
* **rescue**: ボーカルをキーにサイドチェインで**瞬間的に -1～-1.5 dB**下げる（歌区間のみ）。恒常EQ/Compは行わない。
* **適用条件**: Manual（Standard）／Auto（Creator・埋もれ度が閾値超）。

---

## 自動解析と補正（品質担保の考え方）

### テンポ（自動頭出し＆可変テンポ補正）

* **頭出し**: 相互相関 / onset-based で **±10ms目標**。
* **可変テンポ**: ボーカル vs 伴奏のオンセット/クロマで **DTW** → **時間マップ**生成 → Rubber Band にテンポマップ適用。
* **判定**: 拍ズレ（平均|Δt|, 分散）が**改善**した場合のみ採用。

  * 目安: 平均|Δt| ≤ **25–35ms**、分散 **-30%以上**。
  * 信頼低（自由テンポ等）では\*\*上限±4%\*\*でクリップ or 不採用。

### ピッチ（“1音だけ外れ”への対処）

* **検出**: CREPE/pYINでF0→ノート化。キー/コード（伴奏クロマ）を推定。
* **候補**: ノート中心の偏差（cent）が\*\*±35–50\*\*超かつ長さ≥80ms を候補に。
* **適用**: 区間のみピッチ比 `2^(cent/1200)` を適用（**フォルマント保持**）。Rubber Band または **WORLD再合成**。
* **遷移保護**: 前後10–30msのランプ/クロスフェード。ビブラート周期/深さは±10%以内維持。
* **判定**: 補正後に **スケール/コード距離↓・不協和度↓・HNR↑** を確認。中心誤差 **±12–20 cent**以内を合格目安。
* **表現尊重**: ブルーノート/しゃくり等は**包絡保持**で中心のみ補正。ラップ等の無声音主体は自動補正をスキップ。

### 信頼度 & やり過ぎ防止

* **信頼スコア**: F0確信度 + SNR + フォルマント一貫性。
* **クリップ**: テンポ/ピッチとも補正量の上限を設置（テンポ±4%、ピッチ±50 cent）。
* **A/B可視化**: Before/After の **拍ズレ(ms)** / **平均ピッチ誤差(cent)** / **HNR** をUI表示。

---

## API仕様（REST / OpenAPI First）

* `POST   /v1/jobs` : ジョブ作成（DB行作成、アップロード先情報を返す）
* `PATCH  /v1/jobs/:id/files` : instrumental\_path / vocal\_path を確定
* `POST   /v1/jobs/:id/pay` : **都度課金**（成功時のみ `render` 許可）
* `POST   /v1/jobs/:id/render` : キュー投入 → status=`processing`
* `GET    /v1/jobs/:id` : 現在状態とメタ（offset\_ms, atempo 等）
* `GET    /v1/jobs/:id/download?format=mp3|wav` : 署名URLを返す
* `POST   /v1/webhooks/payment` : 決済Webhook（success/failed/refund、**idempotency**）

**設定・最適化系**

* `PATCH  /v1/jobs/:id/settings` : `preset_key`, `micro_adjust`, `inst_policy` を更新（Standard/Creator）
* `POST   /v1/jobs/:id/analysis` : 解析の実行と結果返却（推奨プリセット、信頼度、候補ノート等）
* `POST   /v1/jobs/:id/repitch` : 単一区間のピッチ補正適用（開始/終了時刻, cent）

**サブスク関連**

* `POST   /v1/subscriptions` : プラン申込（lite/standard/creator, 月次）
* `PATCH  /v1/subscriptions` : プラン変更（即時アップ/次回ダウン）・自動追加購入ON/OFF
* `DELETE /v1/subscriptions` : 解約（次回更新で停止）
* `POST   /v1/credits/purchase` : 追加クレジット単発購入

**エラー形式**: `{ code, message, details? }` 統一。
**認証**: Supabase Auth（authenticated前提）、匿名運用なし。

---

## Worker処理（音声パイプライン）

1. 原稿DL（Storage）
2. **オフセット検出**（相互相関 / onset-based、±10ms目標）
3. 必要なら**テンポ補正**

   * Lite: 一定比率（atempo=0.97–1.03）
   * Standard/Creator: **DTW→テンポマップ**をRubber Bandへ適用
4. **ボーカル整音**（HPF→De-esser→Comp→ParamEQ→薄リバーブ）
5. **inst**: 既定 **BYPASS**。必要時のみ **Rescue（sidechaincompress）**
6. **合成**（amix; vocalWeight/instWeight はプリセット＋微調整）
7. **Loudness/Limit**（aloudnorm I=-14, TP≈-1, LRA≈8–11 → alimiter）
8. 結果UL → `jobs.result_path` へ書込み、LUFS/TP測定、メトリクス保存 → `done`

**FFmpeg 概念フィルタグラフ（Creator/Rescue例）**

```
[0:a] highpass,lowpass,deesser,acompressor,equalizer...,aecho [vv];
[1:a] anull [im];
[im][vv] sidechaincompress=threshold=-14dB:ratio=1.3:attack=10:release=120:makeup=0 [ii];
[vv][ii] amix=inputs=2:weights=V|I, loudnorm=I=-14:LRA=8:TP=-1.2, alimiter=limit=0.98 [out]
```

---

## 音質ターゲット（ショート用）

* 既定: **MP3 320kbps** ／ 任意: **WAV 16-bit**（Creatorは48k/24bit推奨）
* **Loudness**: −14 LUFS（±0.5）/ **True Peak ≤ −1 dBTP**
* ボーカル: HPF 80–100Hz / De-esser / コンプレッション（RMS 2–4dB）
* 伴奏: **原則無加工**。歌区間のみ**1–1.5dBダッキング**（Rescue時）

---

## ハモリ（プレビュー→1つ選択）

* 選択肢: **上3度 / 下3度 / 5度**（全プランで生成・プレビュー可）
* 適用コスト:

  * **Lite**: **+0.5C**
  * **Standard / Creator**: **0C（無料）**
* 備考: Economy/Studio区分は**廃止**。フォルマント保持で自然さを確保。

---

## 課金モデル（最新版）

### 単体売り（非会員）

* **¥500／1曲**（基本MIX）
* オプション: **ハモリ適用（1つ） +¥100**

### サブスク（クレジット制）

| プラン          |         月額 |      月次付与 |    1Cあたり目安 | ハモリ適用     | 繰越           |             追加C |
| ------------ | ---------: | --------: | ---------: | --------- | ------------ | --------------: |
| **Lite**     | **¥1,280** |  **3.0C** | **¥427/C** | **+0.5C** | 翌月まで（上限=月付与） | **¥300 / 1.0C** |
| **Standard** | **¥2,480** |  **6.0C** | **¥413/C** | **0C**    | 翌月まで         | **¥300 / 1.0C** |
| **Creator**  | **¥5,980** | **10.0C** | **¥598/C** | **0C**    | 翌月まで         | **¥300 / 1.0C** |

**クレジット消費ルール**

* **基本MIX（inst＋リード ≤60秒）** … **1.0C**
* **ハモリ（上/下3度・5度のいずれか1つ）** … **Lite: +0.5C**｜**Standard/Creator: +0.0C**
* **消費順**: 繰越 → 当月 → 追加購入（FIFO）。

**無料トライアル（推奨）**

* **1曲**、**Standard相当**の機能を体験（プリセット7＋微調整3、DTWテンポ、1音補正、Rescue ON/OFF）
* 出力: **MP3のみ**、**ハモリ1つ適用可（0C）**、保存7日、再出力2回まで

---

## 決済・Idempotency

* 支払いは**成功後に render 許可**。`payment_intent` の **idempotency-key** を保存し**重複処理防止**。
* Webhookは**署名検証**し、**冪等再実行**に耐える設計（受信側でも idempotency-key を検証）。

---

## 環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 決済（Stripe）
PAYMENT_PROVIDER=stripe           # 'stripe' | 'mock'
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# アプリ制約
MAX_DURATION_SEC=60
MAX_FILE_MB=20
SIGNED_URL_TTL_SEC=300
RETENTION_DAYS=7
PRICE_JPY_ONETIME=500
ONETIME_HARMONY_PRICE_JPY=100

# サブスク（プライシング）
SUB_LITE_PRICE_JPY=1280
SUB_LITE_CREDITS=3
SUB_STD_PRICE_JPY=2480
SUB_STD_CREDITS=6
SUB_CREATOR_PRICE_JPY=5980
SUB_CREATOR_CREDITS=10
ADDON_CREDIT_PRICE_JPY=300

# Worker
WORKER_POLL_MS=3000

# DSP/外部ツール
RUBBERBAND_BIN=rubberband
FEATURE_MICROADJUST=true
FEATURE_TEMPO_DTW=true
FEATURE_PITCH_ONE_NOTE_AUTO=true

# Harmony
HARMONY_OPTIONS="up_m3,down_m3,perfect_5th"
HARMONY_COST_LITE_C=0.5
HARMONY_COST_STD_C=0
HARMONY_COST_CREATOR_C=0
```

---

## 非機能要件（品質目標）

* **性能**: 60秒素材の **95%を120秒以内**に完了（標準インスタンス）。
* **信頼性**: 成功率 ≥ **98%**（再試行含む）。
* **保管**: **7日**で自動削除（Edge Function or cron）。

---

## 監視・計測（KPI/イベント）

**イベント**: upload\_started/failed/succeeded, preview\_ready, checkout\_viewed, payment\_succeeded/failed, job\_enqueued, job\_completed/failed, download\_clicked（相関ID付与）。
**KPI**: 完走率、平均処理時間、失敗率、返金率、**単体→サブスク転換率**、**平均C消費/人/月**、**ハモリ適用率**、**拍ズレ改善率**、**平均ピッチ誤差改善（cent）**、**Rescue発火率**。

---

## 受け入れ基準（Acceptance）

* ≤60秒/≤20MB ×2ファイル → 権利チェック → プレビュー → 決済 → 処理 → **MP3/WAV DL が3分以内**に完走。
* 出力は **−14 LUFS（±0.5）/ True Peak ≤ −1 dBTP**。
* **テンポ**: 拍ズレ平均|Δt|が**25–35ms以下**、分散**30%以上改善**している場合のみ採用（失敗時は原音）
* **ピッチ**: 自動修正したノートの中心誤差が\*\*±12–20 cent\*\*以内、HNR↑/不協和度↓を満たす。低信頼区間は適用なし。
* 自動頭出し失敗時、**±2000msスライダー**で無料再試行が成功。
* **inst**は既定BYPASS。Rescueは**必要時のみ**（歌区間限定・最大 -1.5dB 相当）。
* UIはキーボードのみで操作完了、**絵文字/AI風演出なし**。
* 異常（形式/サイズ/秒数/決済失敗）で具体的メッセージと再試行導線を表示。

---

## 重要な注意点（落とし穴対策）

* **重い音声処理はAPIで実行しない**→ Workerへ委譲。
* クライアント→Storage直アップロード＋**RLS/パス規約**で制御。
* すべてprivate。公開URLは使わず**署名URLのみ**。
* RLS不備は致命的：DBとStorage両方で**自ユーザーのみ**操作可を確認。
* **7日削除**のスケジュール実装を忘れない（Edge Function/cron）。

---

## 参考：検出/合成の閾値（初期値）

* **オフセット検出**: onset強度の相互相関最大点 → **±10ms**目標。
* **De-Esser**: i≈6（素材で±2）。
* **Compressor**: th=-18dB, ratio=2:1, attack=15ms, release=120ms。
* **Rescue（ダッキング）**: threshold≈-14dB, ratio≈1.3:1, attack≈10ms, release≈120ms（最大約 -1.5dB）
* **Loudness**: loudnorm I=-14, TP≈-1.2, LRA≈8–11。
* **微調整**: 前後感±15% / 空間0.00–0.45 / 明るさ±2.5dB。

---

## 次に実装すべき機能（優先）

1. **高度なオフセット検出**（Librosa等、相関解析の本格化）
2. **決済連携**（Stripe本番運用）
3. **7日自動削除**（Edge Function or cron）
4. **テスト**（Unit/E2E: Jest/Playwright）
5. **レート制限**・CORS最小化
6. **本番環境**（Docker/compose、監視）
7. **Creator向け WORLD再合成**の切替UIとWorker拡張
8. **声紋プロファイル**の保存・初期値学習（Creator）

---

## Supabase追加作業ログ（随時追記）

**2025-09-\_\_ / 担当: \_\_**

* 変更: `uta-uploads` / `uta-results` バケット作成（private）
* 変更: `storage.objects` RLSポリシー適用（自分のパスのみ read/write、`uta-results` は read のみ）
* 理由: 個人領域以外のアクセス遮断

**2025-09-\_\_ / 担当: \_\_**

* 変更: Edge Function `cleanup-expired` 作成、`RETENTION_DAYS=7` で古いオブジェクト削除（毎日 03:00 JST）
* 理由: 保管期間遵守とコスト削減
