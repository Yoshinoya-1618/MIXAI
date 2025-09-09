# MIXAI Project Context for Claude

## Project Overview
MIXAI is an AI-powered audio mixing platform that provides automated mixing and mastering services. The platform uses machine learning to analyze audio characteristics and apply optimal mixing parameters.

## Recent Implementations

### AI/ML Learning System (2025-01-10)
Implemented a CPU-based machine learning system with the following components:
- Feature extraction from audio (spectral, temporal, MFCC, chroma, loudness features)
- Three ML tasks: master_reg (regression), preset_cls (classification), align_conf (confidence)
- ONNX Runtime for inference (CPU-optimized)
- A/B testing capability for gradual model rollout
- Feature flags for controlling ML capabilities
- Mock implementations to avoid heavy dependencies during development

### Key Files for AI/ML System
- `supabase/migrations/20250110_create_ai_learning_tables.sql` - ML database schema
- `worker/features-mock.ts` - Mock feature extraction (avoids tensorflow dependency)
- `worker/training.ts` - Training pipeline implementation
- `worker/inference.ts` - Inference module
- `app/admin/ml/*` - Admin UI for ML management
- `app/api/v1/ml/*` - ML API endpoints

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Deployment**: Vercel
- **ML/AI**: ONNX Runtime (CPU), Mock implementations for development
- **Audio Processing**: FFmpeg, Web Audio API

## Environment Variables Required
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (Required)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ML Settings (Optional)
ENABLE_CPU_ML=false
ML_MIN_SAMPLES=1000
USE_MOCK_ML=true
```

## Build and Deployment Commands

### Local Development
```bash
npm install
npm run dev
```

### Vercel Local Build Verification
```bash
# Windows
scripts\vercel-local-build.bat

# Unix/Mac
bash scripts/vercel-local-build.sh

# Manual commands
npx vercel link --yes
npx vercel pull --environment=production --yes
npm ci
npx vercel build
```

### Type Checking and Linting
```bash
npx tsc --noEmit
npm run lint
```

### Database Migrations
```bash
# Using Supabase CLI
npx supabase db push

# Manual: Apply migrations in order from supabase/migrations/
```

## Common Issues and Solutions

### TypeScript Errors
- If you encounter type errors during build, check:
  1. All imports are correct
  2. Types are properly defined
  3. Optional chaining is used for nullable values
  4. `typeof window !== 'undefined'` checks for client-only code

### Missing Dependencies
- The project uses mock implementations for heavy ML libraries
- Real implementations require: `@tensorflow/tfjs-node`, `onnxruntime-node`, `web-audio-api`
- Use `USE_MOCK_ML=true` in development

### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules .next .vercel/output
npm ci
npm run build
```

## Project Structure
```
mixai/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── v1/           # Versioned API endpoints
│   │   │   ├── mix/      # Mixing endpoints
│   │   │   └── ml/       # ML endpoints
│   │   └── webhooks/     # Stripe webhooks
│   ├── admin/            # Admin dashboard
│   └── (user pages)      # User-facing pages
├── components/            # React components
├── lib/                  # Utility libraries
├── worker/               # Background workers
│   ├── features-mock.ts  # Feature extraction (mock)
│   ├── training.ts       # ML training
│   └── inference.ts      # ML inference
├── supabase/
│   └── migrations/       # Database migrations
├── scripts/              # Build and utility scripts
└── public/              # Static assets
```

## Testing Checklist
- [ ] User can sign up and log in
- [ ] File upload works
- [ ] Mix processing completes
- [ ] Payment flow works (Stripe)
- [ ] ML features extract correctly (check features_store table)
- [ ] Admin dashboard accessible (requires admin role)
- [ ] Feature flags control ML behavior

## Database Tables (Key)
- `profiles` - User profiles
- `jobs` - Processing jobs
- `features_store` - Extracted audio features
- `model_registry` - Trained ML models
- `feature_flags` - Feature toggles
- `subscriptions` - User subscriptions
- `credits` - User credits

## API Endpoints (Key)
- `POST /api/v1/mix/analyze` - Analyze audio and get mixing parameters
- `POST /api/v1/ml/extract` - Extract features from audio
- `POST /api/v1/ml/train` - Trigger model training
- `POST /api/v1/ml/infer` - Get ML predictions
- `GET /api/admin/stats` - Admin statistics

## Feature Flags
Control ML features via `feature_flags` table:
- `enable_cpu_ml` - Enable CPU-based ML
- `enable_ml_extraction` - Enable feature extraction
- `enable_ml_training` - Enable model training
- `enable_ml_inference` - Enable ML inference

## Contact for Issues
When encountering issues:
1. Check error logs in browser console
2. Check server logs in terminal
3. Verify environment variables
4. Check Supabase logs for database errors
5. Review TypeScript errors with `npx tsc --noEmit`

## Recent Changes (2025-01-10)
1. Implemented complete AI/ML learning system
2. Added mock implementations to avoid heavy dependencies
3. Created admin UI for ML management
4. Added A/B testing capabilities
5. Created Vercel local build verification scripts
6. Updated documentation (DEPLOYMENT_GUIDE.md, QUICK_START.md, PRODUCTION_CHECKLIST.md)

## Notes for Future Development
- ML models start with mock implementations, switch to real when ready
- Use feature flags for gradual rollout
- Monitor `model_metrics` table for model performance
- Keep `USE_MOCK_ML=true` until sufficient training data collected
- Run training jobs via cron or manual trigger from admin panel

---

## Legacy Documentation (Original v2.0 Japanese)

### 3ステージアーティファクト管理
  * **prep**：下ごしらえ済みデータ（`vox_tuned.wav` / `vox_aligned.wav` / `inst_clean.wav`）
  * **ai_ok**：AI仕上げ完了データ（`ai_mix_ref.wav` + `mix_params.json`）
  * **final**：最終確認済みデータ（`final_mix.wav` + `master_params.json`）
  * プラン別TTL：freetrial/prepaid/Lite 7日 / Standard 15日 / Creator 30日

### AIフロー設計
  * **おまかせAI**：下ごしらえ→AI MIX→AI OK判断→ユーザー微調整→最終確認
  * **自分で調整**：AI OK判断済みデータから直接微調整開始
  * 期限切れ時の自動再生成システム

### 認証システム統合
  * Supabase Auth（メール・パスワード + Google OAuth）
  * セッション管理とリアルタイム状態監視
  * 認証必須API群の実装

### セッション中断復旧
  * MIX作業中の自動セッション保存
  * ページ離脱時の警告機能
  * 中断セッション通知とワンクリック復旧

### UI/UX改善
  * 全ページのヘッダー・フッター統一
  * 処理状況の視覚的改善（プログレスバー・詳細情報）
  * エラー時の再試行機能とオフセット調整

---

## プロジェクト概要（v2.0）

歌い手が **伴奏2mix + ボーカル +（任意）ハモリ**（各 **≤60秒**）をアップロード。**1クレジット = 最大60秒のフルMIX&マスタリング1本分**。アドオン（ハモリ全編/HQマスター/強ノイズ抑制）は **各+0.5クレジット**。

### おまかせAIフロー
1. **下ごしらえ**（解析・ピッチ/タイミング補正）→ **prep** 保存
2. **AI MIX** → **AI OK判断**（品質チェック）→ **ai_ok** 保存
3. **ユーザー微調整**（ハモリプレビュー・パラメータ調整）
4. **マスタリング** → **最終確認** → **final** 保存

### 自分で調整フロー
1. **ai_ok** データを起点に直接**ユーザー微調整**開始
2. **マスタリング** → **最終確認**

### 技術スタック
* **フロント**：Next.js（App Router）+ TypeScript + Tailwind CSS
* **認証**：Supabase Auth（メール + Google OAuth）
* **DB/Storage**：Supabase（RLS/Edge Functions）
* **重処理**：外部 Worker（Node + FFmpeg / Rubber Band、必要時 Python: librosa/CREPE/WORLD）
* **課金**：見積→予約（Hold）→実行→成功で確定、失敗は全額返却（reversal）
* **保存期間**：プラン別TTL（freetrial/prepaid/Lite 7日 / Standard 15日 / Creator 30日）
* **再DL**：同一成果物の再ダウンロードは0クレジット

### セキュリティ
* すべて **private**、配布は**署名URL（TTL=300s）**のみ
* **Supabase RLS**で自ユーザーのデータのみアクセス可能

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
* **0クレジット機能**：健康診断（Key/BPM/LUFS）、粗ヘッド合わせ、簡易編集、短尺プレビュー（20秒/96kbps/透かし有）
* **有料機能**：ベース処理 1.0クレジット、アドオン HQマスター/強ノイズ抑制 各+0.5クレジット（ハモリ全編は全プラン0C無料、Creatorは HQ/強ノイズも無料付帯）

---

## 画面遷移（v2.0）

```
# メイン画面
/                       （ランディング + セッション復旧通知）
/auth/login             （メール・パスワード + Google OAuth）
/auth/register          （新規登録 + 認証メール）
/auth/callback          （OAuth コールバック処理）
/mypage                 （マイページ + 中断セッション通知）
/dashboard              （ダッシュボード + プロジェクト管理）
/upload                 （認証必須：ファイル投入 + 権利・秒数チェック）
/preview                （15秒プレビュー + 推定オフセット表示）
/checkout               （都度課金 or サブスク判定）
/processing             （下ごしらえ処理中）
/status/:jobId          （uploaded → analyzing → prep_ready → ai_mixing → ai_ok → editing → complete）
/complete               （処理完了通知）
/result/:jobId          （最終結果：試聴 + ダウンロード）

# サブスクリプション・クレジット購入画面
/pricing                （プラン選択：Lite/Standard/Creator + クレジット購入案内）
/credits                （クレジット購入：2/5/8/12クレジットパック）
/credits/success        （クレジット購入完了）
/subscribe/review       （最終確認 + 請求先情報 + 支払方法）
/subscribe/processing   （処理中）
/subscribe/success      （登録完了 + 7日間無料トライアル開始）
/subscribe/failure      （失敗理由 + 再試行）
/subscribe/confirm      （3DS認証後の結果判定）

# MIX調整ページ（認証必須・プラン別）
/mix/freetrial/:jobId   （7軸 + 参照解析 + ハモリ）※無料トライアル期間中
                        → Creator相当の全機能（無償1C）
                        → ダウンロード時にプラン加入を促す
/mix/prepaid/:jobId     （prepaid専用）※未加入・都度購入
                        → 基本: Standard相当機能（1.0C）
                        → +0.5C: Creator相当機能アップグレード（1.5C合計）
                        → 保存期間7日、優先度は通常
/mix/lite/:jobId        （5軸 + ハモリ）
/mix/standard/:jobId    （6軸 + ジャンル + ハモリ）
/mix/creator/:jobId     （7軸 + 参照解析 + ハモリ）

# 既存
/help, /legal/*, /contact, /pricing, /how-it-works
```

### 状態遷移
```
uploaded → analyzing → prepping → prep_ready → ai_mixing → ai_ok → editing → mastering → rendering → complete
```

- **prep_ready**: 下ごしらえ完了、おまかせAI開始可能
- **ai_ok**: AI仕上げ完了、自分で調整開始可能  
- **editing**: ユーザー微調整中（セッション管理対象）

---

## 料金体系（v2.2更新）

### プラン体系の全体像
* **freetrial**: 新規会員登録時に自動付与（7日間、Creator相当機能、無償1C）
* **prepaid**: 未加入ユーザーのデフォルト状態（都度購入）
* **lite/standard/creator**: サブスクリプションプラン（月額制）

### データベースとUIの表記
* **DB**: 小文字（freetrial, prepaid, lite, standard, creator）
* **UI**: 表示用に先頭大文字変換（Lite, Standard, Creator等）

### 無料トライアル（会員登録特典）
* **freetrial**: 会員登録で自動付与（クレジットカード不要）
  - 無償1クレジット付与
  - 7日間Creator相当の全機能
  - 期限後は自動的にprepaidへ移行

### サブスクリプションプラン
* **Lite**: ¥1,780/月（3クレジット、約¥593/曲）
* **Standard**: ¥3,980/月（6クレジット、約¥663/曲）  
* **Creator**: ¥7,380/月（10クレジット、約¥738/曲）

### 都度購入（prepaid）
* **prepaid**: 未加入ユーザーのデフォルトプラン
  - 基本: Standard相当機能（1.0C）
  - アップグレード: +0.5CでCreator相当機能（1.5C合計）
  - 保存期間7日、優先度通常

### クレジット購入
* **ミニパック**: 2クレジット ¥1,580（¥790/クレジット）
* **スモールパック**: 5クレジット ¥3,800（¥760/クレジット）
* **ミディアムパック**: 8クレジット ¥5,920（¥740/クレジット）
* **ラージパック**: 12クレジット ¥8,400（¥700/クレジット）
* **支払方法**: クレジットカード、コンビニ決済、銀行振込対応

### 課金ルール
* **加入日起算**: 月額は加入日から1ヶ月ごと（カレンダー月ではない）
* **クレジット繰越**: 未使用分は次月に繰越、繰越分から優先消費
* **クレジット有効期限**: 購入クレジットは無期限、サブスク付与分は解約時失効

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

## データモデル（v2.0・RLS前提・全量）

### 列挙型

```sql
create type plan as enum ('freetrial','prepaid','lite','standard','creator');
create type job_status as enum (
  'uploaded','analyzing','prepping','prep_ready','ai_mixing','ai_ok',
  'editing','mastering','rendering','complete','archived','failed'
);
create type artifact_type as enum ('prep','ai_ok','final');
create type inst_policy as enum ('bypass','safety','rescue');
create type credit_event as enum ('grant','consume','purchase','rollback','expire');
create type sub_status as enum ('none','active','past_due','canceled');
```

### jobs（v2.0拡張）

```sql
-- v2.0 拡張: アーティファクト管理
alter table jobs
  add column plan_code text not null default 'prepaid',
  add column prep_artifact_id uuid null,
  add column ai_ok_artifact_id uuid null,
  add column final_artifact_id uuid null,
  add column duration_s int null;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status job_status not null default 'uploaded',
  
  -- v2.0 アーティファクト参照
  plan_code text not null default 'prepaid',
  prep_artifact_id uuid null,
  ai_ok_artifact_id uuid null,  
  final_artifact_id uuid null,
  duration_s integer,

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

-- v2.0 アーティファクト管理テーブル  
create table artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  kind artifact_type not null,
  storage_path text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- TTL設定トリガー（プラン別期限）
create or replace function set_artifact_ttl()
returns trigger as $$
begin
  select
    case j.plan_code
      when 'freetrial' then now() + interval '7 days'
      when 'prepaid' then now() + interval '7 days'
      when 'lite' then now() + interval '7 days'
      when 'standard' then now() + interval '15 days'  
      when 'creator' then now() + interval '30 days'
    end
  into NEW.expires_at
  from jobs j where j.id = NEW.job_id;
  
  return NEW;
end;
$$ language plpgsql;

create trigger artifacts_set_ttl
  before insert on artifacts
  for each row execute function set_artifact_ttl();
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
| ハモリ確定    | **0C無料**（1構成）         | **0C無料**                            | **0C無料**                                     |

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
* **確定**：いずれか1構成を**確定ボタン**で適用（全プラン 0C無料）。`jobs.harmony_choice` と `harmony_level_db` を保存。
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
* ハモリ：**4試聴ボタン**＋`Harmony Level`＋**確定ボタン**（全プラン 0C無料）
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

### v2.0 追加APIエンドポイント

```http
# 認証関連
POST /api/auth/login
  { email, password } → { user, session }
POST /api/auth/register  
  { email, password } → { user, confirmation_sent }
GET  /api/auth/session
  → { user?, session? }

# 3ステージアーティファクト管理
POST /api/jobs/:id/ai-mix
  → prep→AI MIX→OK判定→ai_ok保存, status=ai_ok
  
POST /api/jobs/:id/edit/preview  
  { params?, harmony_trial? }
  → 10秒プレビュー（非保存）
  
POST /api/jobs/:id/commit
  → ai_ok + 調整→マスタリング→レンダー→final保存→complete

# 期限切れ時の再生成
POST /api/jobs/:id/ensure-prep
  → prep_artifact 期限切れ時の再生成
  
POST /api/jobs/:id/ensure-aiok
  → ai_ok_artifact 期限切れ時の再生成

# 既存 `/v1/mix/*`（**すべて0C**・v2.0互換）
POST /v1/mix/analyze
  { jobId, plan, refTrackId? }
  → { meta, aiParams, snapshots:{AI_BASE}, warnings? }

POST /v1/mix/preview
  { jobId, params?, harmony_trial? }
  → { previewUrl, measured, chainSummary }

POST /v1/mix/harmony/apply
  { jobId, choice, level_db? }
  → { ok, harmony_choice, credits_delta? }

POST /v1/mix/export
  { jobId, params?, format, targetLufs }
  → { fileUrl, measured, appliedParams }

POST /v1/mix/reference/analyze   # Creatorのみ
  { jobId, refUploadId }
  → { tonalCurve, dynamics, suggestDiff }
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

### 未加入（従量 / On-Demand）

#### 0クレジットで常時利用可（無料）
* アップロード健康診断（Key / BPM / LUFS / Peak / ノイズ / シビランス）
* 粗ヘッド合わせ（自動オフセット提案 + 手動微調整）
* 簡易編集（フェードIN/OUT・ゲイン・パン・分割・軽プリセット）
* 短尺プレビュー書き出し：**20秒 / 96kbps / 透かし有**（1日1回目安）
* 共有リンク（視聴のみ、DL不可）

#### 有料クレジットで解放（都度）
* ベース処理：**1.0C**（フル自動MIX&マスター、MP3/WAV出力・透かし無）
* アドオン：**各 +0.5C**（ハモリ全編／HQマスター／強ノイズ）
* 保存期限：**7日** / 実行優先度：通常 / 同時実行：1ジョブ
* 失敗・中断は**全額返却（reversal）**。同一成果物の**再DLは0C**

#### 都度チャージ用クレジットパック
| パック名 | クレジット | 価格(税込) | 1Cあたり | 割引率 |
|---|---:|---:|---:|---:|
| **ミニ** | 2C | **¥1,580** | **¥790** | **-1.25%** |
| **スモール** | 5C | **¥3,800** | **¥760** | **-5.00%** |
| **ミディアム** | 8C | **¥5,920** | **¥740** | **-7.50%** |
| **ラージ** | 12C | **¥8,400** | **¥700** | **-12.50%** |

### サブスクリプション（カード決済・月次自動）

| プラン | 月額(税込) | 月次クレジット | 実効単価 | 保存期限 | 優先度 |
|---|---:|---:|---:|---:|---:|
| **Lite** | **¥1,780** | **3C** | **約¥593/C** | **7日** | 通常 |
| **Standard** | **¥3,980** | **6C** | **約¥663/C** | **15日** | 中 |
| **Creator** | **¥7,380** | **10C** | **約¥738/C** | **30日** | 高 |

**クレジット消費ルール**

* ベースMIX&マスター（〜60秒） … **1.0C**
* ハモリ全編 … **+0.5C**
* HQマスター … **+0.5C**
* 強力ノイズ抑制 … **+0.5C**
* 消費順：トライアル → 繰越 → 当月 → 追加購入（FIFO）
* **繰越ルール**：使い切れなかったクレジットはすべて次回更新時に繰り越し（上限なし）
* **更新サイクル**：加入日から1ヶ月ごと（例：1月15日加入→毎月15日更新）

**0C機能（未加入ユーザー向け）**

* 健康診断（Key/BPM/LUFS/Peak/ノイズ/シビランス）
* 粗ヘッド合わせ（自動オフセット提案）
* 簡易編集（フェード/ゲイン/パン）
* 短尺プレビュー（20秒/96kbps/透かし有）

**無料トライアル（推奨）**

* **1曲**、**Standard相当**（汎用3種+ジャンル2種、高精度処理）
* テーマ変更1回可能、AI推奨あり
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
SUB_LITE_PRICE_JPY=1780
SUB_LITE_CREDITS=3
SUB_STD_PRICE_JPY=3980
SUB_STD_CREDITS=6
SUB_CREATOR_PRICE_JPY=7380
SUB_CREATOR_CREDITS=10

# クレジットパック
PACK_MINI_CREDITS=2
PACK_MINI_PRICE_JPY=1580
PACK_SMALL_CREDITS=5
PACK_SMALL_PRICE_JPY=3800
PACK_MEDIUM_CREDITS=8
PACK_MEDIUM_PRICE_JPY=5920
PACK_LARGE_CREDITS=12
PACK_LARGE_PRICE_JPY=8400

# Worker
WORKER_POLL_MS=3000

# MIX後の微調整
FEATURE_POST_MIX_PAGE=true
FREE_OPERATIONS=1      # analyze/preview/export/reference を0C化

# Harmony（候補 & コスト）
HARMONY_OPTIONS="up_m3,down_m3,perfect_5th,up_down"
HARMONY_APPLY_COST_LITE_C=0        # 全プラン無料化
HARMONY_APPLY_COST_STD_C=0
HARMONY_APPLY_COST_CREATOR_C=0
HARMONY_APPLY_COST_PREPAID_C=0     # プリペイドも無料

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

以上、v1.4 は v1.2/1.3 と整合しつつ、**ハモリの"プレビュー即時切替→1構成確定"** をユーザー微調整に統合した、UI/API/DB/Worker/品質ゲート/受け入れ基準/運用までを網羅する全量版です。

---

# MIXAI ダッシュボード：途中離脱対応／完成品の再MIX 要件定義（CLAUDE.md 追記用）

## 0. スコープ
- 本節は **ダッシュボード上の導線・挙動** に限定。
- 対象機能：
  - 途中離脱プロジェクトの復帰（Resume）
  - 完了済み（DONE）プロジェクトの再MIX（ReMix Session）
- UIトーン：**明るめ**（ホームと統一）。カードは**横長リスト**1本に集約。

---

## 1. ルール（共通）
- **保存期限**：プラン別に *生成時* 起算（Light 7日 / Standard 15日 / Creator 30日）。
  - 期限切れ（EXPIRED）は **自動削除・非表示**（復元機能なし）。
- **クレジット課金**：
  - 「再MIX～マスタリング」を **ひとくくり** とし、どこからやり直しても **0.5 クレジット**。
  - 課金は **再MIXセッション開始時** に 1 回だけ。セッション中の連続操作は追加課金なし。
- **保存ポイント（サーバー保持）**：
  1) 下ごしらえ後（`PREPPED`）
  2) AI MIX OK 判定後（`AI_MIX_OK`）
  3) 最終確認後（`DONE`）
- **通知**：サイレント時間 22:00–08:00（JST）

---

## 2. ステータス
`UPLOADED / PREPPED / AI_MIX_OK / TWEAKING / MASTERING / REVIEW / DONE / ARCHIVED`  
（`EXPIRED` は内部のみ・UI 非表示）

---

## 3. ダッシュボード表示（横長リスト）
- 1 本のリストに全件を表示。フィルタチップ：**すべて / 作業中 / AI OK / 完了 / アーカイブ**。
- 各行（カード）：サムネ、曲名、進捗バー、作成/更新日、**残り日数**（3日以下は警告色）。
- **途中離脱行のCTA**：右側に **「続きから」ボタンのみ** を表示（他のCTAやメニューは非表示）。
- **AI_MIX_OK 行**：
  - 主ボタン：**続きから**
  - 付随メニュー：**AI再MIX → 微調整 → マスタリングへ**（順序固定）
- **DONE/ARCHIVED 行**：
  - 主ボタン：再生 / 共有（閲覧）
  - メニュー：**再MIX**（AI再MIX → 微調整 → マスタリングへ）

---

## 4. 途中離脱の復帰（Resume）
### 対象ステータス
`PREPPED / AI_MIX_OK / TWEAKING / MASTERING / REVIEW`

### 遷移先
- `PREPPED` → **AI MIX 画面**
- `AI_MIX_OK` → **微調整画面**（AI OK 値を初期値）
- `TWEAKING` → **微調整画面**（ユーザー下書き復元）
- `MASTERING` → **マスタリング画面**（前回設定復元）
- `REVIEW` → **最終確認画面**

### 復帰モーダル
- 文言：「前回は〈{ステップ名}〉の途中でした。ここから再開します。」
- 表示：想定所要、保存期限、残クレジット
- アクション：**続ける / キャンセル**
- **課金なし**（再開は無料）

### 実行制御
- 1 プロジェクトにつき **同時実行 1 ジョブ**。実行中は他行をグレーアウト＋「処理中…」バッジ。
- 失敗時：赤バッジ＋「再試行」。サーバー起因は自動返却（返金）対象。

---

## 5. 完成品の再MIX（ReMix Session）
### 対象
- `DONE`（および `ARCHIVED`）

### メニュー（順序固定）
1. **AI再MIX（0.5）**：`PREPPED` から再解析→AI MIX実行→新しい `AI_MIX_OK` を生成
2. **微調整（0.5）**：直近の `AI_MIX_OK` から微調整のみやり直し
3. **マスタリングへ（0.5）**：直近の微調整版から仕上げのみやり直し

> 注：いずれを選んでも **セッション開始時に 0.5 消費**。開始後 24h は追加入金なしで連続操作可能。

### セッション仕様
- エンティティ：`RemixSession { id, projectId, startedAt, charged=true, expiresAt(+24h) }`
- 終了条件：最終確認を完了 / 24h 無操作 / ユーザー明示終了
- ダッシュボード表示：対象行に紫バッジ **「再MIX中」**＋残り時間カウントダウン

### 返金ポリシー
- サーバーエラー／タイムアウト／非対応形式：**全額返金**
- ユーザー都合中断・品質不満：返金なし

---

## 6. 受け入れ基準（Acceptance Criteria）
1. 途中離脱行で **「続きから」以外のCTAが表示されない**。
2. `AI_MIX_OK` の行：主ボタン「続きから」＋メニューが **AI再MIX → 微調整 → マスタリング** の順で表示される。
3. `DONE` の行から再MIXを開始すると、**開始時に 0.5 クレジット**が減算され、以降 24h は追加課金なし。
4. 生成時起算の期限が切れたプロジェクトは、**リロードなし**でも自動的に一覧から消える。
5. サーバー障害で失敗した再MIXは、自動返金され、行に「再試行」CTAが出る。

---

## 7. API / データ（最小）
### Project（抜粋）
```ts
id: string
status: Status
plan: 'Light'|'Standard'|'Creator'
createdAt: ISO
updatedAt: ISO
checkpoints?: { prepped?: ISO; aiOk?: ISO; done?: ISO }
```

### RemixSession（新規）
```ts
id: string
projectId: string
startedAt: ISO
expiresAt: ISO   // startedAt + 24h
charged: boolean // 常に true（開始時に0.5消費）
```

### エンドポイント（案）
- `POST /projects/:id/resume` → 途中復帰（無料）
- `POST /projects/:id/remix`  → 再MIXセッション開始（0.5消費） body: { mode: 'AIMIX'|'TWEAK'|'MASTER' }
- `POST /remix-sessions/:id/end` → セッション終了
- `GET /projects?excludeExpired=true` → 期限切れ除外（既定 true）

---

## 8. イベントログ
- `RESUME_CLICKED {projectId, fromStatus}`
- `REMIX_SESSION_STARTED {projectId, mode, charge:0.5}`
- `REMIX_SESSION_ENDED {projectId, reason}`
- `JOB_STARTED/JOB_SUCCEEDED/JOB_FAILED {projectId, kind}`
- `AUTO_DELETE_EXPIRED {projectId, plan, createdAt, expiredAt}`

---

## 9. エッジケース
- 素材欠損：復帰前チェックで検出 → アップロード誘導。
- 二重セッション：同プロジェクトに既存セッションがある場合、引き継ぐか終了して開始するかを選択。
- クレジット不足：再MIX開始時に不足モーダル → チャージ導線。

---

## 10. 文言（例）
- 復帰モーダル：「前回は〈{step}〉の途中でした。ここから再開します。」
- 再MIX開始：「この操作で 0.5 クレジットを使用します（24時間内の連続操作は追加課金なし）。」
- 期限警告：「保存期限まで残り {n} 日」

---

## 11. QA チェックリスト（抜粋）
- [ ] 途中離脱カードに他CTAが出ない
- [ ] `AI_MIX_OK` のメニュー順が仕様どおり
- [ ] 再MIX開始で 0.5 減算 → 24h 内追加課金なし
- [ ] 期限切れ自動削除
- [ ] 失敗時の自動返金と再試行CTA

---

## 12. サブスクリプション（Stripeホスト完結）要件定義 v1.2

### 12.1 基本方針
- **Stripe Checkout（ホスト）** と **Billing Portal** のみを使用
- 自社ドメインで個人情報・クレジットカード情報を扱わない（PCI SAQ-A相当）
- 請求先情報はStripe側で収集・管理

### 12.2 プラン定義
- **Lite**: 月額¥1,280 / 月次付与 3.0C / 保存期限7日
- **Standard**: 月額¥2,980 / 月次付与 6.0C / 保存期限15日
- **Creator**: 月額¥5,980 / 月次付与 10.0C / 保存期限30日
- **追加クレジット**: ¥300 / 1C（都度課金）
- **更新サイクル**: 加入日基準で1ヶ月ごと（Anniversary Billing）

### 12.3 無料トライアル（7日間）
- **新規会員登録ユーザー対象**（メール認証のみ）
- **Creator同等機能**（カスタムテーマ等全部盛り）
- **無償1Cクレジット付与**
- **クレジットカード登録不要**
- 期限後：prepaid（未加入）へ自動移行
- ダウンロード時にプラン加入/クレジット購入を促す
### 12.4 プラン変更ポリシー
- **アップグレード**: 即時反映、差額請求、差分クレジット即付与
- **ダウングレード**: 次回更新から反映
- **与信失敗（past_due）**: 猶予7日、DLのみ可（新規MIX/再MIX/追加C購入不可）
- **解約**: 期間末解約（日割りなし）、残クレジット失効

### 12.4 サブスク画面フロー（Stripeホスト完結）

#### 画面遷移
1. `/pricing`：プラン選択 → 「このプランで続ける」
2. **Stripe Checkoutへリダイレクト**（氏名/住所/電話/カード情報をStripe側で入力）
3. `/subscribe/success`：成功戻り先（`?session_id=cs_...`）
4. `/subscribe/cancel`：キャンセル戻り先
5. `/billing/return`：Billing Portal戻り先

#### コピー
- /pricing: 「**お支払いと請求先の入力はStripeの安全なページで行います**」
- /success: 「**無料トライアルを開始しました**。請求情報の確認・変更は**Stripeポータル**から」

### 12.5 APIエンドポイント
- `POST /api/checkout/session`：サブスク用Checkout Session作成
- `POST /api/checkout/addon`：追加クレジット購入用
- `POST /api/billing/portal`：Billing PortalセッションURL作成
- `GET /api/billing/status`：現契約/残C/更新日/トライアル残
- `POST /api/webhooks/stripe`：Webhook受信（冪等）

### 12.6 データ保持ポリシー
- **保持する**：`stripe_customer_id`, `subscription_id`, `plan_code`, `status`, `period`, `credits`
- **保持しない**：氏名、住所、電話、カード情報（PAN/CVC/有効期限/トークン）
- **ログ**：Webhookのevent.idとtypeのみ保存（全文・個人情報は保存禁止）

### 12.7 バックエンドデータモデル
```sql
-- プランマスタ
create table plans (
  code text primary key,
  name text not null,
  price_jpy integer not null,
  monthly_credits decimal(10,2) not null,
  storage_days integer not null,
  features jsonb
);

-- サブスクリプション
create table subscriptions (
  user_id uuid primary key references auth.users(id),
  plan_code text references plans(code),
  status text, -- 'none'|'active'|'past_due'|'canceled'
  current_period_start timestamp,
  current_period_end timestamp,
  auto_renew boolean default true,
  trial_ends_at timestamp
);

-- クレジット台帳
create table credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event text, -- 'grant'|'consume'|'purchase'|'rollback'|'expire'
  delta_credits decimal(10,2),
  bucket text, -- 'trial'|'monthly'|'carryover'|'addon'
  reason text,
  job_id uuid references jobs(id),
  created_at timestamp default now()
);

-- Stripe顧客情報
create table billing_customers (
  user_id uuid primary key references auth.users(id),
  stripe_customer_id text unique,
  default_payment_method_id text,
  billing_profile jsonb -- 請求先情報
);
```

### 12.8 Stripe連携詳細
#### Checkout設定
- `mode='subscription'`
- `customer_creation='always'`  
- `billing_address_collection='required'`
- `phone_number_collection.enabled=true`
- `subscription_data.trial_period_days=7`
- `custom_fields`: company（会社名）, department（部署）, bill_to（請求書宛名）
- `success_url=/subscribe/success?session_id={CHECKOUT_SESSION_ID}`
- `cancel_url=/subscribe/cancel`

#### Webhookマッピング
- `checkout.session.completed`：サブスクリプション作成、trial 2.0C付与
- `invoice.paid`：monthlyクレジット付与、status='active'
- `invoice.payment_failed`：status='past_due'、猜予7日
- `customer.subscription.updated`：プラン変更反映
- **冪等性**：`billing_events`でevent.idを保存し二重実行防止

### 12.9 受け入れ基準
1. 自社ドメインでカード情報入力UIやPayment Elementを提供していない
2. Stripe Checkoutで氏名/住所/電話/カードを入力し、3DS/決済が完結
3. Webhook処理のみでsubscriptionsとcredit_ledgerが更新され、PIIはDBに保存されない
4. プラン変更/支払方法更新/解約はBilling Portalのみで実施
5. 成功/キャンセル時に/subscribe/success|cancelに戻る
6. ログ/監査情報にPII/カード情報が含まれない

---

## 13. フッター実装 & SEO/特商法要件定義

### 13.1 フッターIA（情報設計）
#### カラム構成
- **Brand & CTA**: ロゴ/キャッチコピー/「無料で始める」「料金を見る」
- **製品**: MIXの始め方ガイド/機能一覧/デモ曲/ダッシュボード
- **アカウント**: マイページ/請求履歴/クレジット購入
- **リソース**: ドキュメント/FAQ/ステータス/お問い合わせ
- **ポリシー/法務**: 
  - 特定商取引法に基づく表示（`/legal/tokushoho`）
  - 利用規約（`/legal/terms`）
  - プライバシーポリシー（`/legal/privacy`）
  - クッキーポリシー（`/legal/cookies`）
  - 返金ポリシー（`/legal/refund`）
- **会社情報**: 会社概要/採用/プレス/NAP情報/T番号
- **言語/地域**: 言語切替（ja/en）
- **SNS**: X/YouTube/TikTok/note

#### ボトムバー
- © {year} MIXAI Inc.
- NAP（郵便番号・住所・TEL・営業時間）
- サイトマップ/robots.txtリンク

### 13.2 SEO対策
#### 構造化データ（JSON-LD）
```javascript
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MIXAI",
  "url": "https://mixai.example.com",
  "logo": "https://mixai.example.com/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "telephone": "+81-3-xxxx-xxxx",
    "areaServed": "JP",
    "availableLanguage": ["ja"]
  },
  "sameAs": [
    "https://x.com/mixai",
    "https://www.youtube.com/@mixai"
  ]
}
```

#### 技術要件
- `hreflang`タグ（ja/en）
- 自動生成`/sitemap.xml`
- NAP一貫性（全ページで統一）
- WCAG AA準拠（コントラスト比、フォーカス可視）

### 13.3 特定商取引法ページ（`/legal/tokushoho`）
#### 必須掲載項目
- **事業者名**: 法人名/代表者名
- **所在地**: 郵便番号〜建物名・階まで
- **電話番号**: 連絡可能時間帯も明記
- **メールアドレス**: または問い合わせフォーム
- **販売価格**: 税込表示、クレジット単価
- **支払方法/時期**: クレジットカード、都度/サブスク
- **役務提供時期**: 決済後の処理開始〜完了目安
- **返品/キャンセル**: デジタル役務の性質上不可（例外：サーバー起因の失敗時）
- **動作環境**: 対応ブラウザ、推奨環境
- **適格請求書発行事業者登録番号**（T番号）

#### 表示様式
- フッターから1クリックで到達
- 最終更新日表示
- 印刷用スタイル対応

### 13.4 実装優先度
1. フッターコンポーネント作成（レスポンシブ対応）
2. 特商法ページ作成
3. 利用規約/プライバシーポリシー作成
4. 構造化データ実装
5. サイトマップ自動生成

---

## 14. 実装チェックリスト

### サブスクリプション
- [ ] `/pricing`ページ作成（3プランカード表示）
- [ ] `/subscribe/review`最終確認画面（請求先情報フォーム）
- [ ] `/subscribe/success`完了画面
- [ ] Stripe Payment Element統合
- [ ] Webhook処理実装（invoice.paid等）
- [ ] クレジット付与/消費ロジック
- [ ] Billing Portal連携

### フッター/SEO/法務
- [ ] フッターコンポーネント（全ページ共通）
- [ ] `/legal/tokushoho`特商法ページ
- [ ] `/legal/terms`利用規約
- [ ] `/legal/privacy`プライバシーポリシー
- [ ] 構造化データ（JSON-LD）
- [ ] hreflangタグ実装
- [ ] サイトマップ自動生成

---

## 15. Creator自動付与（HQマスター/強力ノイズ抑制）＋Worker要件 v1.0

### 15.1 目的 / スコープ
- **目的**：Creator ユーザーに対し、最終品質（解像感・音圧・S/N）を恒常的に引き上げ、手戻りと再処理を削減。
- **範囲**：プラン機能差分、クレジット消費、UI表示、API/I/F、Worker処理、監視・受入基準。

### 15.2 仕様（差分要約）
- **Creator**
  - **HQマスター：自動ON（0クレジット）**
  - **強力ノイズ抑制：自動ON（0クレジット）**（自動判定で強度を調整。閾値以下のクリーン素材は自動的に控えめ適用/バイパス）
  - ユーザーUI：詳細設定を出さず、**［高度処理：ON（推奨）/OFF］** のトグルのみ（初期 ON）。
- **Standard / Lite / 未加入（従量）**
  - 既定どおり：ベース処理のみ（標準ノイズ対策は従来の軽処理に留める）。HQ/強ノイズの明示的な提供は**なし**。
- **クレジット消費**：**全プラン共通で変更なし**（ベース 1.0クレジット、ハモリ確定 0.5クレジット/Liteのみ、他 0クレジット）。Creator の HQ/強ノイズは**追加消費ゼロ**。

### 15.3 機能比較表（更新版）

| 機能 | 未加入（従量） | Lite | Standard | Creator |
|---|---|---|---|---|
| **月額料金** | **¥0** | **¥1,780** | **¥3,980** | **¥7,380** |
| **月間クレジット** | **0** | **3** | **6** | **10** |
| **HQマスター** | — | — | — | **自動付与（0クレジット）** |
| **強力ノイズ抑制** | — | — | — | **自動付与（0クレジット）** |
| **ハモリ生成（オプション）** | **+0.5クレジット** | **無料** | **無料** | **無料** |
| **保存期限** | **7日** | **7日** | **15日** | **30日** |
| **実行優先度** | 通常 | 通常 | 優先 | 最優先 |

### 15.4 DB/設定の変更点
#### `plans.features` の追記（例）
```sql
UPDATE plans
SET features = coalesce(features,'{}'::jsonb)
  || jsonb_build_object(
    'hq_master_included', true,
    'denoise_strong_included', true,
    'hq_master_params', jsonb_build_object(
      'oversampling', 16, 'true_peak', true, 'ceiling_dbTP', -1.0,
      'target_lufs', -14, 'limiter_pass', 2
    ),
    'denoise_strong_params', jsonb_build_object(
      'mode', 'auto', 'max_reduction_db', 14,
      'transient_guard', true, 'musical_noise_guard', true
    )
  )
WHERE code='creator';
```

#### 環境変数（例）
```bash
# Creator 高度処理の既定ON/OFF（運用での一時停止用）
CREATOR_HQ_MASTER_DEFAULT=1
CREATOR_DENOISE_STRONG_DEFAULT=1
# オーバーサンプリング上限・安全パラメータ
MASTER_OS_MAX=16
MASTER_TP_CEILING_DB=-1.0
DENOISE_MAX_REDUCTION_DB=14
```

### 15.5 API / I/F（差分）
- **入力（レンダー系）**：`plan` が `creator` の場合、サーバーは `advanced.enableHqMaster=true` / `advanced.enableStrongDenoise=true` を内部で付与。
- **任意トグル**：UIで OFF にした場合のみ `advanced.skipHqMaster=true` / `advanced.skipStrongDenoise=true` を送る。
- **出力（メトリクス）**：`metrics.noise_reduction_db`、`metrics.true_peak_dbTP`、`metrics.lufs_integrated` を返却。`appliedParams.advanced` に適用可否を記録。

### 15.6 Worker 要件定義（新規）
#### パイプライン差し込み位置
```
[入力DL] → [オフセット/テンポ] → [ボーカル整音(HPF/De-esser/Comp/EQ)]
 → **[強力ノイズ抑制（Creatorのみ/自動）]**
 → [合成/Rescue Ducking] → [自動微調整ループ]
 → **[HQマスター（Creatorのみ）]** → [loudnorm 2pass / Dither] → [保存]
```

#### 強力ノイズ抑制（Creator）
- **適用条件**：`SNR_estimate < θ` または `床ノイズRMS > θ2` で強度↑。クリーン素材は**軽適用 or バイパス**。
- **パラメータ**（初期値）：`max_reduction=14dB`, `transient_guard=ON`, `musical_noise_guard=ON`。
- **評価**：`NR_applied_db` をメトリクス化。**子音/アタック歪み検出**時は 1 段階弱めて再試行（最大2回）。

#### HQマスター（Creator）
- **チェーン**：EQ(linear) → MBComp(5band) → ParallelSat → Stereo/MS → Limiter1 → Limiter2(OS **16x**, TP検出) → loudnorm(2pass) → Dither
- **目標**：`−14 LUFS (±0.3)` / `TP ≤ −1.0 dBTP` / 段別合計GR ≤ `6 dB`。
- **再試行**：TP超過 or LUFS未達時は Limiter2 閾値 ±0.2dB で最大3回リトライ。

#### 失敗・冪等・ロールバック
- 入出力に **idempotency key**（`job.id + phase`）を付与。途中失敗は**部分再実行**。
- Worker 失敗時は API が `ledger.reversal()` を呼び、**クレジット返却**（既存ポリシー）。

#### 性能・同時実行
- CreatorのHQ/強ノイズは高負荷。**同時実行スロット**を `LITE:2 / STD:2 / CREATOR:1` 目安で制御（キュー優先度：Creator>Standard>Lite>未加入）。
- **SLO**：60秒素材で **P95 180秒以内** 完了を維持。負荷に応じて OS を自動ダウングレード（16x→8x）。

#### ロギング/メトリクス
- 保存：`metrics`（`snr_before/after`, `nr_applied_db`, `lufs`, `tp`, `gr_total`）。
- 監視KPI：`再出力率`, `TP違反率`, `NRアーティファクト率`（ヒューリスティクス: 高域バズ比など）。

### 15.7 UI/表示（差分）
- 料金ページ：Creator 行に **「HQマスター/強力ノイズ抑制：自動付与（追加クレジット不要）」** の注記。
- MIXページ（Creatorのみ）：
  - トグル **［高度処理（HQ/強ノイズ）］ON/OFF**（初期 ON）。
  - ツールチップ：「素材の状態に応じて自動調整します。音が不自然な場合はOFFにしてください。」

### 15.8 受け入れ基準（Acceptance）
1. Creator レンダーで **HQ/強ノイズが既定ON**、追加クレジット消費が**0**である。
2. `metrics` に `noise_reduction_db / lufs / true_peak_dbTP` が保存される。
3. `−14 LUFS (±0.3)`、`TP ≤ −1.0 dBTP`、`GR合計 ≤ 6dB` を**95%**以上で満たす。
4. 強ノイズ適用時に **子音つぶれ検出**で自動弱体化→再試行が行われる（最大2回）。
5. OFFトグルで HQ/強ノイズが完全にバイパスされ、通常チェーンで出力される。

### 15.9 リリース計画 / ロールバック
- **段階導入**：Creator の 10% → 50% → 100%（日次）
- 指標：`再出力率`、`TP違反率`、`NRアーティファクト率`、`処理時間`。閾値超過で `CREATOR_*_DEFAULT=0` に切替（即時停止）。

### 15.10 補足（互換・将来拡張）
- 将来、Standard に「月×回の HQ/強ノイズ無料」枠を付与する場合：`features.addon_core_free_monthly` を流用（0.5クレジット換算→0クレジット化）。
- 長尺拡張（>60s）時は、HQ/強ノイズの適用を**代表区間**に限定し、全体へ係数適用。または Core 消費の逓増で整合を取る。
