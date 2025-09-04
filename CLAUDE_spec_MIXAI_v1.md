# MIXAI 要件定義 v1.0（Claude Code用）
更新日: 2025-09-04

## 目的
- 歌い手が工程名を意識せずに「おまかせAI」または「自分で調整」で仕上げに到達できる。
- サーバーは *prep / ai_ok / final* の3スナップショットを保存し、プラン別のTTLで運用。
- 既存のMIX工程ページを再利用し、実装コストを最小化。

## ユーザーフロー
### おまかせAI
1. 下ごしらえ（解析・ピッチ/タイミング補正）
2. AI MIX
3. **AIのOK判断**（クリッピング率・短期LUFS・ボーカル/伴奏比・SNR改善）
4. ユーザー微調整（ハモリプレビュー可）
5. マスタリング
6. **最終確認**（final保存）

### 自分で調整
1. **AI OK判断済みデータ**を起点
2. ユーザー微調整（ハモリプレビュー）
3. マスタリング
4. 最終確認

## 保存するアーティファクト
- **prep**：`vox_tuned.wav` / `vox_aligned.wav` / `inst_clean.wav`（最小必要セット）
- **ai_ok**：`ai_mix_ref.wav` + `mix_params.json`
- **final**：`final_mix.wav` + `master_params.json`
- プレビューはキャッシュ扱い（非保存）。

## 保存期間（TTL）
- Lite: **7日**, Standard: **15日**, Creator: **30日**（prep / ai_ok / final の全て）
- 期限切れ時：
  - ai_ok 欠落 →「自分で調整」は不可。**おまかせAIで再生成**してから開始。
  - prep 欠落 → **最初から再処理**（素材変更扱い）。
  - final 欠落 → ai_ok から**再エクスポート**可能。

## 状態遷移
- uploaded → analyzing → prepping → **prep_ready** → ai_mixing → **ai_ok** → editing → mastering → rendering → **complete**
- 自分で調整の開始点は `ai_ok`。

## ダッシュボード / UI
- カード：バッジ（下ごしらえ済み / AI仕上げOK / 最終確認済み）、TTL残日数の表示。
- CTA：**［仕上げる］**（おまかせAI） / **［自分で調整］**（ai_okが存在するときのみ活性）。
- 編集UI：6コントロール（ボーカル量 / やわらかさ / 残響 / 明るさ / 低音 / フェード）＋上級（ディエッサー/サチュ/ステレオ感/ノイズゲート）。
- ハモリ：**生成（任意）**＋**プレビュー**（ソロ/ミュート/音量）。

## 課金
- プレビュー（10秒）は無料・非保存。
- **/commit** 実行時に Hold → 成功で確定、失敗は解放。
- 再仕上げの例：軽い再仕上げ 0.3C/分、素材変更 1.0C/分。

## API（App Router / Node）
- `POST /api/jobs/:id/ai-mix` → prep→AI MIX→OK判定→ai_ok保存, status=ai_ok
- `POST /api/jobs/:id/edit/preview` → つまみ入力→10秒プレビュー（非保存）
- `POST /api/jobs/:id/commit` → ai_ok + 調整→マスタリング→レンダー→final保存→complete
- 補助API：`/api/jobs/:id/ensure-prep`, `/api/jobs/:id/ensure-aiok`（期限切れ時の再生成）

## DB（要点）
```sql
create type plan as enum ('lite','standard','creator');
create type job_status as enum (
  'uploaded','analyzing','prepping','prep_ready','ai_mixing','ai_ok',
  'editing','mastering','rendering','complete','archived','failed'
);
create type artifact_type as enum ('prep','ai_ok','final');

alter table jobs
  add column plan plan not null default 'lite',
  add column status job_status not null default 'uploaded',
  add column prep_artifact_id uuid null,
  add column ai_ok_artifact_id uuid null,
  add column final_artifact_id uuid null,
  add column duration_s int null;

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  kind artifact_type not null,
  storage_path text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
```

- TTLは `plan` に応じて `expires_at` を設定（INSERTトリガ）。
- RLS：`jobs.user_id = auth.uid()` のみ許可、`artifacts`は `job_id` 経由チェック。

## MVP実装順
1. 3スナップショット保存＋TTL
2. `/api/jobs/:id/ai-mix` と `/api/jobs/:id/commit`（課金Hold→確定）
3. ダッシュボードのCTA/TTL表示、編集UI（6コントロール＋ハモリ）
4. 期限切れ時の自動再生成（ensure-*）

## 用語（歌い手表示）
- 下ごしらえ＝解析＋ピッチ/タイミング補正
- 仕上げる＝AI MIXを起点に微調整→マスタリング→最終確認
- 自分で調整＝AI OKデータから直接微調整→マスタリング→最終確認
