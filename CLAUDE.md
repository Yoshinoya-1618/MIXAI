# CLAUDE.md — うた整音（Uta Seion）開発ガイド v1.4（ハモリ選択プレビュー統合・全量）

> 本ドキュメントは **v1.2（添付）を基礎**に、v1.3 で導入した **MIX後の微調整ページ／0C（クレジット消費ゼロ）／プラン別UI差分** を統合し、さらに **「ボーカル・ハモリ先解析→補正→合成→再解析→AI OK→ユーザー微調整→最終マスタリング」** と **“ハモリをユーザー微調整の段階でプレビューしながら1構成を確定”** を盛り込んだ **全量版 v1.4** です。既存のディレクトリ/命名は尊重し、**追加ルートは `/mix/<plan>/<jobId>`・`/v1/mix/*`・`/mix/ok/<jobId>`** のみ（`/mix/ok` は初回モーダル代替可）。

---

## 差分サマリー（v1.2 → v1.4）

* **処理順序の厳密化**：

  1. Vocal/Harmony **先解析** → 2) **タイミング/ピッチ補正** → 3) **Vocal Bus MIX** → 4) **inst合成** → 5) **再解析＆自動微調整（最大3ループ）** → 6) **AI OK** → 7) **MIX完了サマリー** → 8) **ユーザー微調整** → 9) **最終マスタリング** → 10) **最終確認/ダウンロード**
* **MIX後の微調整ページ**：`/mix/lite/[jobId]`｜`/mix/standard/[jobId]`｜`/mix/creator/[jobId]`

  * 到達＝未解析なら **解析→AI MIX適用（冪等）** を自動実行
  * **初期値は“AI適用後の実値”**（プリセット静的値は廃止）。A/B（-14 LUFS）・30sプレビュー・書き出しは **0C**
* **ハモリ選定の仕様変更**：

  * **選定はユーザー微調整段で**。4パターンを**試聴ボタン**で即切替 → **1構成だけ確定**
  * 試聴：`Lead+Up m3`｜`Lead+Down m3`｜`Lead+5th`｜`Lead+Up+Down m3`（上下3度）
  * 試聴は **0C**、**確定はLiteのみ +0.5C**（Standard/Creatorは0C）
* **0Cの明文化**：**解析／プレビュー生成（30s）／最終書き出し／参照曲解析（Creator）** はすべて **0C**
* **DB拡張（互換）**：`jobs.ai_params/user_params/last_export_params/metrics` に加え、`harmony_paths/harmony_generated/harmony_mode/harmony_choice/harmony_level_db` を追加。Creator参照用 `mix_refs`（任意）
* **新ルート**：`/mix/ok/:jobId`（AI OK サマリー）。直遷移時は `/mix/<plan>/<jobId>` の**初回モーダル**で代替可

---

## プロジェクト概要（改）

歌い手が **伴奏2mix + ボーカル +（任意）ハモリ**（各 **≤60秒**）をアップロード → **AI処理**（頭出し/テンポ/ピッチ/整音→Vocalバス→inst合成→自動微調整）→ **AI OK** → **プラン別の微調整（この段でハモリ選定）** → **最終マスタリング** → **ダウンロード**。

* **MIX後の微調整**：AI適用後の実値からノブ/フェーダーを少しだけ動かす思想
* **技術**：Next.js（App Router）+ Supabase（Auth/DB/Storage/RLS/Edge Functions）+ 外部 Worker（Node + FFmpeg / Rubber Band、必要時 Python: librosa/CREPE/WORLD）
* **課金**：サブスク（基本）＋単体売り（¥500/曲）。**解析/プレビュー/書き出し/参照解析は 0C**。ハモリ確定は **Liteのみ +0.5C**
* **保存**：private、**7日で自動削除**、配布は\*\*署名URL（TTL=300s）\*\*のみ
* **対象**：Web（モバイル優先・レスポンシブ）

---

## アーキテクチャ

```
フロント: Next.js (App Router, TS) + Tailwind
API    : Next.js Route Handlers（軽処理）＋ /v1/mix/* 新設
重処理 : 外部 Node Worker（FFmpeg + Rubber Band + 任意Python）
DB/RLS : Supabase（Auth/DB/Storage/RLS）
キュー : BullMQ/Redis（または Supabase Jobs 代替）
```

**方針**

* **instは原則BYPASS**（クリップ安全処理のみ）。埋没時のみ歌区間で **Rescue（-1〜-1.5dB duck）**
* **MIX後の微調整**は **AI適用値** 起点。**A/B** は-14 LUFS 正規化で瞬時比較
* **0C** 運用は **同時2件/分6リク/日10エクスポート** などの上限で防御

---

## 画面/遷移

```
/                     （ランディング）
/upload                （2–3ファイル投入 + 権利・秒数チェック）
/preview               （15秒プレビュー + 推定オフセット表示）
/checkout              （都度課金 or サブスク判定）
/status/:jobId         （uploaded → paid → processing → done|failed）
/result/:jobId         （試聴 + MP3/WAVダウンロード）
/mix/ok/:jobId         ← NEW：MIX完了サマリー（AI OK）
/mix/lite/:jobId       （5軸 + ハモリアドリションUI）
/mix/standard/:jobId   （6軸 + ジャンル + 手動参照AB + ハモリアドリションUI）
/mix/creator/:jobId    （7軸 + 参照解析 + 局所最適化 + ハモリアドリションUI）
/help, /legal/*, /contact（既存）
```

> `/mix/ok/:jobId` をスキップして直接 `/mix/<plan>/<jobId>` に来た場合、**初回モーダル**で同内容を表示。

---

## UIスタイル契約（厳守）

* ❌ **禁止**：ガラスモーフィズム、強ネオン/発光、巨大角丸、ロボット/魔法表現、絵文字、過剰スケルトン演出、誇張コピー
* ✅ **推奨**：実務的UI（8pxグリッド、角丸4–12px、最小限の影、落ち着いたアクセント1色、AAコントラスト）。文言は **動詞ベース短文**
* アクセシビリティ：キーボード完結、フォーカス可視、aria-liveで進捗告知、適切ラベル、**WCAG 2.1 AA**

---

## セキュリティ

* すべて **private**。配布は **署名URL（TTL=300s）** のみ
* RLS：DB/Storage とも **自ユーザーの行/パス以外不可**
* バリデーション：拡張子/MIME/秒数/サイズ、レート制限、CORS最小化、決済周辺のCSRF
* **DRM/市販カラオケ禁止**。権利確認はユーザー自己申告＋注意喚起

---

## データモデル（RLS前提・全量）

### 列挙型

```sql
create type job_status as enum ('uploaded','paid','processing','done','failed');
create type inst_policy as enum ('bypass','safety','rescue');
create type credit_event as enum ('grant','consume','purchase','rollback','expire');
create type sub_status as enum ('none','active','past_due','canceled');
```

### jobs（拡張済み）

```sql
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status job_status not null default 'uploaded',

  -- 入出力
  instrumental_path text,
  vocal_path text,
  result_path text,
  out_format text default 'mp3',      -- 'mp3'|'wav'
  sample_rate int,                    -- 44100|48000
  bit_depth int,                      -- 16|24 (wav時)

  -- 解析/処理パラメータ
  plan_code text references public.plans(code),
  preset_key text,                    -- 'clean_light'等（12種、ヒント用途）
  inst_policy inst_policy default 'bypass',
  micro_adjust jsonb,                 -- 互換用
  offset_ms integer,
  atempo numeric,
  tempo_map_applied boolean default false,
  rescue_applied boolean default false,

  -- メトリクス（Before/After）
  beat_dev_ms_before numeric,
  beat_dev_ms_after numeric,
  pitch_err_cent_before numeric,
  pitch_err_cent_after numeric,
  hnr_before numeric,
  hnr_after numeric,

  -- ラウドネス
  target_lufs numeric not null default -14,
  measured_lufs numeric,
  true_peak numeric,

  -- v1.3+ 追加
  ai_params jsonb,            -- AI適用直後（AI_BASE）
  user_params jsonb,          -- 現在の編集（USER_EDIT）
  last_export_params jsonb,   -- 直近書き出し（LAST_EXPORT）
  metrics jsonb,              -- LUFS/TP/PLR/GR ほか測定

  -- v1.4 ハモリ（任意）
  harmony_paths jsonb,        -- ユーザーが追加したハモリのパス群
  harmony_generated boolean default false, -- 生成したか
  harmony_mode text,          -- 準備した候補（'up_m3'|'down_m3'|'p5'|'up_down'等）
  harmony_choice text,        -- ユーザーが確定した構成（同上 or 'none'）
  harmony_level_db numeric default -6, -- UIフェーダー

  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### クレジット台帳

```sql
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  event credit_event not null,
  credits numeric not null,               -- 正: 付与/購入、負: 消費
  reason text,
  job_id uuid references public.jobs(id),
  created_at timestamptz default now()
);
```

### プラン＆サブスク

```sql
create table if not exists public.plans (
  code text primary key,                  -- 'lite'|'standard'|'creator'
  name text not null,
  price_jpy integer not null,
  monthly_credits numeric not null,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  plan_code text references public.plans(code),
  status sub_status not null default 'none',
  current_period_start timestamptz,
  current_period_end timestamptz,
  auto_renew boolean default true,
  auto_buy_addon boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Creator 参照曲

```sql
create table if not exists public.mix_refs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  upload_id uuid,
  analysis jsonb,              -- tonal/dynamics/stereo/weights
  created_at timestamptz default now()
);
```

**Storage設計**

* `uta-uploads` : ユーザー直アップロード（private）
* `uta-results` : Worker専用書き込み（private）
* パス：`users/{uid}/jobs/{job_id}/...`

---

## プラン差別化（Lite / Standard / Creator）

**共通**：ページ到達で未解析なら **解析→AI MIX適用**。ノブ初期値は **AI適用実値**。A/B（-14 LUFS）、30sプレビュー、pre/postMasterトグル、0C書き出し、ハモリアドリションUIが共通。

| 項目       | Lite                       | Standard                               | Creator                                         |
| -------- | -------------------------- | -------------------------------------- | ----------------------------------------------- |
| 目標品質     | 〜80%                       | **80–90%**                             | **+90%**（参照マッチ）                                 |
| ノブ数      | 5軸                         | **6軸（+Clarity）**                       | **7軸（+Presence/Exciter）**                       |
| ノブ軸      | Air/Body/Punch/Width/Vocal | Air/Body/Punch/Width/Vocal/**Clarity** | Air/Body/Punch/Width/Vocal/Clarity/**Presence** |
| ジャンル     | —                          | **J-Pop/ROCK/EDM/Ballad**（差分適用）        | 同左＋**参照自動マッチ**                                  |
| 参照       | —                          | **手動AB視聴のみ**                           | **解析＋差分追従＋ABX**                                 |
| MB       | 3band                      | **4band**                              | **5band（可変クロス）**                                |
| De-esser | 単帯域                        | **マルチ帯域**                              | マルチ帯域＋sibilant検出強化                              |
| Ducking  | 固定1dB                      | **解析連動1–2dB**                          | **文節/母音連動0.5–2.5dB**                            |
| Stereo   | <120Hz Mono                | **Side制御＋アパーチャ微調**                     | **自動アパーチャ最適**                                   |
| OS       | 4x                         | **8x**                                 | **16x**                                         |
| 書き出し     | MP3/WAV                    | +FLAC                                  | +32f（将来：Stem）                                   |
| ハモリ確定    | **+0.5C**（1構成）             | **0C**                                 | **0C**                                          |

**ノブ→DSPレンジ**

* Air：8–12k shelf ±0–2.5dB（Exciter微量）
* Body：200–350Hz bell ±0–2dB ＋ 80–120Hz MB比率 0–10%
* Punch：低域MB GR上限（-1.5〜+1.5dB）＋Atk/Rel プリセット
* Width：中高域Side ±10%（<120Hz Mono固定）
* Vocal：2–4k bell ±0–1.5dB ＋ 在時Ducking 0–2dB
* Clarity（Std/Cr）：0.6–2k DynEQ 0–2dB
* Presence（Cr）：倍音 0–5%

---

## ハモリ（ユーザー微調整段のアドリションUI）

* **目的**：固定の選択式ではなく、**試聴しながら**最適な構成を**1つ**確定
* **試聴モード（0C）**：

  * `Lead + Up m3（上3度）`
  * `Lead + Down m3（下3度）`
  * `Lead + Perfect 5th（5度）`
  * `Lead + Up m3 + Down m3（上下3度同時）`
* **確定**：いずれか1構成を**確定ボタン**で適用（Liteのみ +0.5C、Standard/Creator は 0C）。`jobs.harmony_choice` と `harmony_level_db` を保存。
* **レベル**：`Harmony Level` フェーダー（-12〜0 dB）
* **実装**：`/v1/mix/preview` で `harmony_trial` を受け、状態に影響させず**即時切替**。`/v1/mix/harmony/apply` で確定＆台帳記帳。

---

## Standard プラン UI（詳細）

* ルート：`/mix/standard/[jobId]`
* ヘッダー：曲長/LUFS/TP、「AI解析済み」バッジ、**ジャンル**（AI推定→切替は **USER\_EDITに係数差分適用**）
* プレビュー：波形、**A/B**、Loop、-14 LUFS 正規化、**pre/postMaster** トグル
* コントロール：6軸（Air/Body/Punch/Width/Vocal/**Clarity**）
* 微調整（開閉）：De-esser帯域（S/SH）・閾値、MBタイム定数（3段）
* 参照（任意）：**手動AB視聴**のみ（解析なし）
* ハモリ：**4試聴ボタン**＋`Harmony Level`＋**確定ボタン**（Liteのみ +0.5C 注記）
* アクション：30sプレビュー（0C）／書き出し（MP3/WAV/FLAC｜0C）
* ガード：GR合計>6dB→ Punch/Clarity/De-esser を5–10%戻す。TP> -1.0dBTP→ Limiter2閾値 -0.2dB刻み×3

---

## 自動解析と補正（品質担保）

### テンポ（頭出し＆可変テンポ）

* 頭出し：相互相関 / onset-based（**±10ms目標**）
* 可変テンポ：Vocal vs inst のオンセット/クロマで **DTW** → テンポマップ（Lite=固定 atempo 0.97–1.03）
* 判定：拍ズレ **平均|Δt| ≤25–35ms**、分散 **-30%以上** 改善時のみ採用

### ピッチ（“1音外れ”の対処）

* 検出：CREPE/pYIN → ノート化、キー/コード推定
* 候補：cent 偏差 **±35–50**、長さ≥80ms
* 適用：±40–50 cent、**フォルマント保持**、ランプ/クロスフェード10–30ms、ビブラート周期/深さ±10%内
* 判定：補正後 **±12–20 cent**、HNR↑、不協和度↓。ラップ等はスキップ

### 自動微調整（S3後段）

* 目標：ボーカル前後関係、低域タイト、シビランス上限、Side安全枠
* 小幅調整：Vocal ±1.5dB、Clarity 0–2dB、Ducking 0–2dB、Punch/Width 微修正
* ガード：段別GR合計 ≤6dB、TP予測 > -1dBTP は事前緩和

---

## API 仕様（REST / OpenAPI First）

### 既存 `/v1/jobs/*`

* `POST   /v1/jobs`（ジョブ作成、アップロード先発行）
* `PATCH  /v1/jobs/:id/files`（inst/vocal/harmony 確定）
* `POST   /v1/jobs/:id/pay`（都度/サブスク）
* `POST   /v1/jobs/:id/render`（キュー投入 → `processing`）
* `GET    /v1/jobs/:id`（現在状態とメタ）
* `GET    /v1/jobs/:id/download?format=mp3|wav|flac`（署名URL）
* `POST   /v1/webhooks/payment`（決済Webhook、**idempotency**）

### 追加 `/v1/mix/*`（**すべて0C**）

```http
POST /v1/mix/analyze
  { jobId, plan:'lite'|'standard'|'creator', refTrackId? }
  → { meta, aiParams, snapshots:{AI_BASE}, warnings? }

POST /v1/mix/preview
  { jobId, params?, mode:'preMaster'|'postMaster', section?, harmony_trial:'none'|'up_m3'|'down_m3'|'p5'|'up_down' }
  → { previewUrl, measured:{ lufs, tp }, chainSummary }
  # harmony_trial は状態を変更しない即時試聴

POST /v1/mix/harmony/apply
  { jobId, choice:'up_m3'|'down_m3'|'p5'|'up_down'|'none', level_db? }
  → { ok:true, harmony_choice, harmony_level_db, credits_delta? }
  # Lite のみ credits_delta=-0.5 を credit_ledger に記帳

POST /v1/mix/export
  { jobId, params?, format:'mp3'|'wav16'|'wav24'|'flac', targetLufs }
  → { fileUrl, measured:{ lufs, tp }, appliedParams, logs }

POST /v1/mix/reference/analyze   # Creatorのみ
  { jobId, refUploadId }
  → { tonalCurve, dynamics, stereo, weights, suggestDiff }
```

* `params?` 省略時は `jobs.user_params`。`appliedParams` を保存して再現性確保
* 冪等：素材差分なき再呼び出しは再解析を省略

---

## Worker処理（音声パイプライン）

1. 原稿DL（Storage）
2. **オフセット検出**（±10ms目標）
3. **テンポ補正**：Lite=固定 atempo／Std/Cr=DTW テンポマップ（±4%）
4. **ボーカル整音**：HPF→De-esser→Comp→ParamEQ→薄リバーブ
5. **ハモリ候補の準備**：up\_m3/down\_m3/p5/up\_down を生成 or 準備（未確定）
6. **Vocal Bus**：Glue Comp + 共通EQ（0.6–2kHz）
7. **inst合成**：`amix`、必要時 **Rescue**（歌区間 -1〜-1.5dB）
8. **再解析→自動微調整**：LUFS/TP/Tilt/PLR/前後指標→小幅修正（最大3ループ、**GR合計 ≤6dB**）
9. 成果保存：`jobs.result_path`・`ai_params`・`metrics`・`status='done'`

---

## DSPチェーン（最終書き出し）

* TiltEQ → ResonanceTamer → De-esser → **MBComp**（Lite=3｜Std=4｜Cr=5）→ ParallelSat → Stereo/MS（<120Hz Mono/Side安全枠）→ Limiter1→Limiter2（OS 4/8/16x, Ceiling -1.0dBTP）→ **loudnorm 2-pass**（-14/-11/-9）→ Dither（必要時）
* **品質ゲート**：LUFS ±0.3、TP ≤ -1.0 dBTP、段別GR合計 ≤6dB。未達は Limiter2閾値を -0.2dB 刻みで最大3回 → なおNGはノブ可動域クランプ

---

## 音質ターゲット（ショート用）

* 既定：**MP3 320kbps** ／ 任意：**WAV 16-bit**（Creatorは48k/24bit推奨、将来32f）
* ラウドネス：**−14 LUFS（±0.3）**／ **True Peak ≤ −1.0 dBTP**
* inst：原則無加工、Rescue は歌区間のみ 1–1.5dB duck

---

## 課金モデル（最新版）

### 単体売り（非会員）

* **¥500／1曲**（基本MIX）

### サブスク（クレジット制）

| プラン      |     月額 |  月次付与 | 1Cあたり目安 | ハモリ確定     | 繰越           |       追加C |
| -------- | -----: | ----: | ------: | --------- | ------------ | --------: |
| Lite     | ¥1,280 |  3.0C |  ¥427/C | **+0.5C** | 翌月まで（上限=月付与） | ¥300/1.0C |
| Standard | ¥2,480 |  6.0C |  ¥413/C | 0C        | 翌月まで         | ¥300/1.0C |
| Creator  | ¥5,980 | 10.0C |  ¥598/C | 0C        | 翌月まで         | ¥300/1.0C |

**クレジット消費ルール**

* 基本MIX（inst＋リード ≤60秒） … **1.0C**
* **ハモリ確定（1構成）** … **Lite：+0.5C**｜**Standard/Creator：+0.0C**
* 消費順：繰越 → 当月 → 追加購入（FIFO）

**0C（消費なし）**

* **解析（初回/再）／プレビュー30s／最終書き出し／参照曲解析（Creator）**

**無料トライアル（推奨）**

* **1曲**、**Standard相当**（プリセット7＋微調整3、DTWテンポ、1音補正、Rescue ON/OFF）
* 出力：**MP3のみ**、**ハモリ確定=0C**、保存7日、再出力2回まで

---

## 決済・Idempotency

* 支払い成功後にのみ render 許可。`payment_intent` の **idempotency-key** を保存し重複防止
* Webhookは署名検証し、冪等再実行に耐える設計（受信側でも idempotency-key 検証）

---

## 環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 決済（Stripe）
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# アプリ制約
MAX_DURATION_SEC=60
MAX_FILE_MB=20
SIGNED_URL_TTL_SEC=300
RETENTION_DAYS=7
PRICE_JPY_ONETIME=500

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

# MIX後の微調整
FEATURE_POST_MIX_PAGE=true
FREE_OPERATIONS=1      # analyze/preview/export/reference を0C化

# Harmony（候補 & コスト）
HARMONY_OPTIONS="up_m3,down_m3,perfect_5th,up_down"
HARMONY_APPLY_COST_LITE_C=0.5
HARMONY_APPLY_COST_STD_C=0
HARMONY_APPLY_COST_CREATOR_C=0

# DSP/外部ツール
RUBBERBAND_BIN=rubberband
FEATURE_TEMPO_DTW=true
FEATURE_PITCH_ONE_NOTE_AUTO=true
FEATURE_MICROADJUST=true
```

---

## 非機能要件（品質目標）

* **性能**：60秒素材の **95%を120–180秒以内** に完了（標準インスタンス）
* **信頼性**：成功率 ≥ **98%**（再試行含む）
* **保管**：**7日**で自動削除（Edge Function or cron）

---

## 監視・計測（KPI/イベント）

**イベント**

* `upload_started/failed/succeeded`, `preview_ready`, `checkout_viewed`, `payment_succeeded/failed`, `job_enqueued`, `job_completed/failed`, `download_clicked`
* `mix_ai_ok_passed/failed`, `mix_modal_shown`, `mix_page_opened`, `mix_ab_toggled`, `mix_preview_rendered`, `mix_exported`, `mix_ref_analyzed`,
* `harmony_audition_clicked`, `harmony_applied`

**KPI**

* 完走率、平均処理時間、失敗率、返金率
* **A/B利用率**、**微調整→書き出し率**、再書き出し回数
* **ジャンル切替採用率**、**参照追従率**
* **拍ズレ改善率**、**平均ピッチ誤差改善（cent）**、**Rescue発火率**
* **ハモリ試聴→確定率**

---

## 受け入れ基準（Acceptance）

* S1：拍ズレ **平均|Δt| ≤25–35ms**、分散 **-30%以上** 改善
* S1：ピッチ補正後の中心誤差 **±12–20 cent**、HNR↑/不協和度↓。低信頼区間は適用なし
* S3：最大3ループで **AI OK** 到達。warn 通過時はサマリーに注意表示
* `/mix/<plan>/<jobId>` 初回で **AI適用実値** が表示され、A/B・フェード・pre/postMaster・0C書き出しが動作
* **ハモリアドリションUI**：4試聴ボタンで遅延なく切替、**1構成を確定**（Liteは ledger -0.5C）
* 出力：**−14 LUFS（±0.3）/ TP ≤ −1.0 dBTP**、段別GR合計 ≤6dB（自動補正最大3回で合格）
* 60秒/≤20MB ×2–3ファイル → 3分以内に DL まで完走（95%）

---

## 重要な注意点（落とし穴対策）

* **重処理はAPIで実行しない** → Workerへ委譲
* クライアント→Storage直アップロード＋**RLS/パス規約**で制御
* すべて private。公開URLを使わず **署名URLのみ**
* **7日削除** のスケジュール実装を忘れない
* 0C化の乱用防止に **レート/上限** を厳密適用

---

## ランディングページUI仕様（要点再掲）

* ヒーロー：キャッチ「歌声が、主役になる。」、Demo（Before/After）、Upload セクション（WAV/MP3〜20MB・60秒）
* Teasers/Benefits/HowItWorks/Pricing/FAQ/Legal/Contact。UIトークン：`--brand: #6D5EF7` 他（v1.2準拠）

---

## 次に実装すべき機能（優先）

1. **/v1/mix/* API*\*（冪等解析／プレビュー：`harmony_trial`／`harmony.apply`／書き出し／参照解析）
2. **/mix/<plan>/<jobId>**（Lite→Standard→Creator 順、初回モーダル＆ハモリアドリションUI）
3. **スナップショット管理**（AI\_BASE／USER\_EDIT／LAST\_EXPORT）
4. **品質ゲート＆自動クランプ**（TP超過・過大GR）
5. **レート/上限** 設定（同時2・分6・日10）
6. Standard：ジャンル係数差分の実装／Creator：参照差分プロット＆追従率／ABX

---

## 付録：エッジケース/フォールバック

* 自由テンポ/ラップ：DTW不採用→固定 atempo or 無補正
* F0低信頼：ピッチ補正スキップ（マスク）、ログ警告
* ハモリ位相/極性：クロスフェード延長・極性反転検証
* クリッピング素材：前段トリム、Limiter前 -1〜-2dB ゲイン
* 超ラウド：Limiter1/2しきい値自動上げ→再測定
* 長尺（将来）：代表区間±15s プレビュー、Export は分割

---

### 備考

* `preset_key` は **スタイル種別のヒント** として保持（AI初期化の補助）。UIから“固定プリセット”の印象は排除
* 既存の **クレジット台帳／サブスク／価格テーブル** は v1.2 を踏襲。**0C対象** と **ハモリアドリション** を本書で確定

以上、v1.4 は v1.2/1.3 と整合しつつ、**ハモリの“プレビュー即時切替→1構成確定”** をユーザー微調整に統合した、UI/API/DB/Worker/品質ゲート/受け入れ基準/運用までを網羅する全量版です。
