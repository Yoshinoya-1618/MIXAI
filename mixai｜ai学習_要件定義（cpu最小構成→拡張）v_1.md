# MIXAI｜AI学習 要件定義（CPU最小構成→拡張）v1.0
日付: 2025-09-09 / 対象: Next.js 15 + Supabase(Postgres/Storage) + Node Worker / 学習: Python(scikit‑learn, lightgbm) → ONNX / 推論: onnxruntime‑node(CPU)

> 目的: **GPUなし**でも実用的な“AIあり体験”を提供し、段階的に拡張できる学習基盤を定義する。コスト最小（¥1万円/月目安）で、**マスター値回帰**・**プリセット推薦**・（任意）**アライン信頼度**から着手。将来は Deep 系（分離/ノイズ）推論や学習へ拡張可能。

---

## 1. ゴール / 非ゴール
### ゴール
- 軽量学習（CPU）で **音源の最適化パラメータ推定** と **プリセット推薦** を実現。
- 週次自動再学習 + A/B（5%→25%→100%）で安全に精度改善。
- 収集・保持・同意・削除の**ガバナンス**が取れた運用。

### 非ゴール（初期）
- Deep 分離/Deep ノイズの**再学習**（推論は必要時のみ）。
- GPU常時稼働の大規模トレーニング。

---

## 2. フェーズとスコープ
- **Phase A（CPU最小）**: マスター値回帰 / プリセット推薦 / アライン信頼度（任意）。
- **Phase B（効率化）**: 特徴量/派生データ中心の保存、オンライン学習（partial_fit）、擬似教師の強化。
- **Phase C（拡張）**: 分離/Deepノイズの推論統合 → 蒸留 or 軽量化学習、GPU短時間学習。

---

## 3. 対象タスク（初期）
1) **マスター値回帰（回帰）**: [low_shelf_db, high_shelf_db, comp_db, target_lufs]
2) **プリセット推薦（分類/ランキング）**: 歌声特徴 + 曲調 → 候補プリセットID（Top‑k）
3) **アライン信頼度（小分類）**: DTW/GCCの結果に対して品質ラベル。

---

## 4. データ収集 & 同意・ガバナンス
- 同意: アップロードUIで **QA（品質改善）** と **学習（training）** を分離した**オプトイン**。撤回は即時除外 + 派生データは24h以内削除。
- 最小化: 原音の長期保存は避け、**30–60秒プレビュー**と**特徴量（数百次元）**を長期保存。
- 保持: 既定保持（inst=7d / vocal=7d / master=15d / preview=30d）。`legal_hold` で停止可。
- 越境: 将来の海外リージョン利用は許容（規約に明記）。
- 監査: 収集・閲覧・再生・モデル切替を `audit_logs` に記録。

---

## 4.1 使うデータの範囲・用途・改善効果

### データ種別と保持
| データ種別 | 取得源 | 長期保存 | 主目的 |
|---|---|---|---|
| **inst / vocal 原音（フル）** | ユーザーアップロード | **しない**（inst=7日 / vocal=7日） | 処理・サポート（短期保有） |
| **mix / master（フル）** | ワーカー出力 | **しない**（master=15日） | 受け渡し、QA（短期保有） |
| **30–60秒プレビュー（inst/vocal/mix）** | ワーカー生成 | **する**（preview=30日、延長なし） | 学習・QA（同意時のみ） |
| **特徴量ベクトル（~160次元）** | librosa + pyloudnorm | **する（長期）** | 学習の主材料（原音代替） |
| **メタデータ**（user_id, job_id, plan, 任意でBPM/Key） | アプリ | **する（必要最小限）** | 集計・分析・重複排除 |
| **ラベル**（擬似教師・プリセットID・品質タグ） | DSP/ルール/人手 | **する（長期）** | 学習の教師データ |

> **前提**: 学習利用は**オプトイン**のときのみ。撤回時は**即時除外**＋**24h以内**にプレビュー/特徴量を削除。既に学習済みの重みは原則遡及不可（透明性レポートで明記）。

### タスク別の利用と期待される改善
| タスク | 入力（使用データ） | モデル出力 | 適用箇所 | 改善項目（KPI例） |
|---|---|---|---|---|
| **マスター値回帰** | プレビュー/ mix の**特徴量** + ラベル（EQ/Comp/LUFS） | [low_shelf_db, high_shelf_db, comp_db, target_lufs] | DSPチェーンに適用 | 再処理率↓、処理時間↓、音量/質感の一貫性↑（MAE、再実行率、CSAT） |
| **プリセット推薦** | vocal + mix の**特徴量**（＋任意のBPM/Key） | プリセットID Top‑k | UIの初期選択/自動適用 | 試行回数↓、初回での納得率↑（採用率、上書き率、CSAT） |
| **アライン信頼度** | inst×vocal の**DTWコスト/GCCシフト/SNR等の統計** | ok/warn/fail | 自動フォールバック/再試行 | アライン失敗率↓、サポート負荷↓（失敗率、再試行回数、MTTR） |

### 非利用（除外）ポリシー
- **長期保存しない**: フル長の原音（inst/vocal/mix/master）。
- **扱わない**: 歌詞テキストの内容理解や人物特定を目的とする処理、第三者への販売/共有。
- **公開側に出さない**: `NEXT_PUBLIC_` を付けない秘密値、署名付きURLは短期（120秒）。

### 撤回/削除の挙動
- 撤回即時に学習キューから**除外**。24h以内に**プレビュー/特徴量/ラベル**を削除（`audit_logs` 記録）。
- `legal_hold=true` のデータは**削除停止**（管理者のみ設定可）。

---

## 5. データ仕様
### 5.1 オーディオ
- 入力: 48kHz/24bit WAV 推奨、長さ 30–60秒プレビュー（mono優先）。
- メタ: user_id, job_id, plan, bpm(任意), key(任意), uploaded_at。

### 5.2 特徴量（CPUで高速）
- log‑mel (n_mels=64) の **mean/std**（128次元）
- RMS, Zero‑Crossing Rate, Spectral Centroid, Rolloff, Flux の **mean/std**（計 10次元程度）
- Loudness/LRA/Crest（pyloudnorm）… **3次元**
- 合計目安: **~160次元**（float32）

### 5.3 ラベル
- 回帰: DSPチェーンから得る擬似教師（差分から推定）。
- 分類: プリセットID（ヒューリスティック or 簡易規則で付与→後で人手補正可）。

---

## 6. 収集フロー（アップロード→特徴量→保存）
1) ユーザーが inst/vocal をアップ → ワーカーが **アライン（GCC‑PHAT+DTW）**。
2) DSPで **HQマスター** を生成（正規化→コンプ→リミッタ→シェルフEQ）。
3) 30–60秒プレビュー（96kbps mono AAC）と波形PNG/JSONを作成。
4) **特徴量抽出**（librosa+pyloudnorm）→ `features_store` へ保存。
5) 擬似教師/プリセットIDを `labels` に保存。`vault_items` に派生物の参照も作成。

---

## 7. ストレージ / DB スキーマ
```sql
-- 特徴量ストア
create table if not exists features_store (
  id bigserial primary key,
  job_id uuid not null,
  user_id uuid not null,
  clip_kind text not null check (clip_kind in ('inst','vocal','mix')),
  n_dim int not null,
  vec float4[] not null,        -- ~160次元
  stats jsonb,                   -- 追加統計（LUFS/LRA等）
  created_at timestamptz default now()
);

-- ラベル
create table if not exists labels (
  id bigserial primary key,
  job_id uuid not null,
  task text not null check (task in ('master_reg','preset_cls','align_conf')),
  y_reg float4[],                -- 回帰の教師（4次元）
  y_cls text,                    -- 分類の教師（プリセットID）
  quality text default 'auto',   -- auto / human / low
  created_at timestamptz default now()
);

-- モデルレジストリ
create table if not exists model_registry (
  id bigserial primary key,
  name text not null,            -- e.g. master_reg
  version text not null,         -- e.g. v20250909
  uri text not null,             -- storage path to onnx
  framework text not null,       -- skl2onnx
  input_dim int not null,
  output_dim int not null,
  metrics jsonb not null,        -- {mae:..., r2:...}
  created_at timestamptz default now(),
  created_by uuid
);

-- オンライン計測
create table if not exists model_metrics (
  id bigserial primary key,
  model_id bigint references model_registry(id) on delete cascade,
  window text not null,          -- 1d/7d/30d
  n int not null,
  latency_ms float8,             -- 平均
  err_rate float8,               -- 失敗率
  created_at timestamptz default now()
);
```

---

## 8. 特徴量設計（詳細）
- 前処理: 48k mono, 22050Hz へダウンサンプリング可（速度優先）。
- log‑mel: `librosa.feature.melspectrogram` → `power_to_db` → 各帯域の mean/std。
- 統計: RMS, ZCR, Centroid, Rolloff, Flux（各mean/std）。
- ラウドネス: `pyloudnorm.Meter.integrated_loudness` / LRA / Crest。
- 正規化: 学習時に StandardScaler を適用（パイプラインに含む）。

---

## 9. ラベリング（教師の用意）
- **回帰**: 既定DSPチェーンの出力と素のmixの差分から、EQ/Comp/LUFSを**連続値ラベル**化。
- **分類**: ルール（BPM/スペクトル傾向/声量）で暫定プリセットID→人手で一部校正。
- 品質タグ: `quality=auto/human/low` で学習時の重み付けに利用。

---

## 10. 学習パイプライン（CPU）
- ライブラリ: `scikit-learn`, `lightgbm`, `skl2onnx`。
- モデル:
  - 回帰: **StandardScaler → MultiOutput(Ridge)**（alpha=1.0 を起点）。
  - 分類: **StandardScaler → LogisticRegression(ovr)**。必要に応じて LightGBM（CPU, early_stopping）。
- 検証: 5-fold CV（stratify可）。指標: **MAE**（回帰）, **F1/ACC**（分類）。
- 書出: `skl2onnx` で ONNX 変換、`model_registry` へ登録。
- スケジュール: **週1（日曜 04:00 JST）**。新着100件毎に `SGD* .partial_fit` で部分学習可。
- 再現性: `random_state` 固定、学習ログを `audit_logs` に残す。

---

## 11. 推論アーキテクチャ
- Node ワーカーで **onnxruntime‑node（CPU）** を使用。
- 入出力: `float32[1, n_dim]` → `float32[1, out_dim]`。
- SLO: 1件 **<50ms**（平均）、タイムアウト 3s、同時実行 1–2。
- 障害時: 旧モデルへロールバック。ロード失敗/閾値逸脱で自動切替。

---

## 12. フラグ & A/B ロールアウト
- Feature Flags: `enable_cpu_ml`, `enable_hq_master`, `enable_align`。
- 配分: **5% → 25% → 100%**、監視指標が悪化で即ロールバック。
- 指標: 失敗率、平均処理時間、再処理率、簡易CSAT/NPS。

---

## 13. モニタリング / アラート
- オフライン: CV指標、学習所要時間、データ件数。
- オンライン: 推論レイテンシ、失敗率、出力分布のドリフト（移動平均で監視）。
- アラート: Slack `#mixai-ml-alerts` / `#mixai-ops-alerts`（SLO逸脱/学習失敗/削除失敗）。

---

## 14. コスト/SLO/容量
- 推論: CPUのみ、**<50ms/件**。
- 学習: **5k–20k クリップ**で**数分以内**（8コア想定）。週1回。月額**¥1万円**目安（Storage/関数含む）。
- ストレージ: 特徴量を長期、原音は保持日数で削除。上限 200GB–1TB、80/90/95%で段階抑制。

---

## 15. セキュリティ/法務
- `.env*` は Git 管理外。CI/デプロイ先の **Environment Variables/Secrets** を利用。
- 個人情報（音声含む）: 目的限定・同意・撤回・監査。越境は説明の上で許容。
- 管理UIの原本閲覧は**二名承認（4‑eyes）**、署名URLは短期（120秒）。

---

## 16. 受け入れ条件（Acceptance Criteria）
1) CPUのみで **回帰/分類モデルの推論**が onnxruntime で動作し、平均 <50ms。
2) 週次再学習（5-fold検証→ONNX登録）が自動実行され、`model_registry` に履歴が残る。
3) A/B（5→25→100%）に従い段階配信、SLO逸脱時は自動ロールバック。
4) 特徴量は `features_store` に保存され、原音は保持日数で自動削除。
5) 収集/閲覧/モデル切替は `audit_logs` に記録される。

---

## 17. 実装タスクリスト（Phase A）
- [ ] `features_store` / `labels` / `model_registry` / `model_metrics` の作成
- [ ] 特徴量抽出ワーカー（librosa+pyloudnorm, CPU）
- [ ] 学習スクリプト（scikit‑learn, skl2onnx）と Cron（週1, 04:00 JST）
- [ ] 推論モジュール（onnxruntime‑node, CPU）
- [ ] `/admin/flags` に `enable_cpu_ml` と配分UI
- [ ] `/admin` ダッシュボードに MAE/F1/処理時間/失敗率のカード
- [ ] Slack 通知（学習成功/失敗, 指標悪化）

---

## 18. API / Server Actions（例）
```ts
// app/admin/actions.ts
export async function trainMinimalNow(task: 'master_reg'|'preset_cls') {}
export async function registerModel(meta: {name:string, version:string, uri:string, input:number, output:number, metrics:any}){}
export async function setRollout(key: string, percent: number){}
export async function getOnlineMetrics(modelId: number, window: '1d'|'7d'|'30d'){}
```

---

## 19. 将来拡張
- LightGBM/TabNet 等での精度向上、ハイパラ自動化。
- 分離/Deepノイズの推論統合 → 蒸留で軽量化 → 必要に応じてGPU学習短時間。
- データドリフト検知と自動再学習閾値。

