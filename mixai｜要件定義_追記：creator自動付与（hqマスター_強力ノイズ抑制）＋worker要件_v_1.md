# MIXAI｜要件定義 追記：Creator自動付与（HQマスター/強力ノイズ抑制）＋Worker要件 v1.0

> 本書は既存の要件定義（CLAUDE.md / 料金・機能表）に対する**追記**です。Creator プランにおいて **HQマスター** と **強力ノイズ抑制** を**追加クレジット不要で自動付与**します。Lite/Standard/未加入の仕様は変更しません。

---

## 1. 目的 / スコープ
- **目的**：Creator ユーザーに対し、最終品質（解像感・音圧・S/N）を恒常的に引き上げ、手戻りと再処理を削減。
- **範囲**：プラン機能差分、クレジット消費、UI表示、API/I/F、Worker処理、監視・受入基準。

---

## 2. 仕様（差分要約）
- **Creator**
  - **HQマスター：自動ON（0C）**
  - **強力ノイズ抑制：自動ON（0C）**（自動判定で強度を調整。閾値以下のクリーン素材は自動的に控えめ適用/バイパス）
  - ユーザーUI：詳細設定を出さず、**［高度処理：ON（推奨）/OFF］** のトグルのみ（初期 ON）。
- **Standard / Lite / 未加入（従量）**
  - 既定どおり：ベース処理のみ（標準ノイズ対策は従来の軽処理に留める）。HQ/強ノイズの明示的な提供は**なし**。
- **クレジット消費**：**全プラン共通で変更なし**（ベース 1.0C、ハモリ確定 0.5C/Lite,未加入のみ、他 0C）。Creator の HQ/強ノイズは**追加消費ゼロ**。

---

## 3. 機能比較表

| 機能 | 未加入（従量） | Lite | Standard | Creator |
|---|---|---|---|---|
| **月額料金** | **¥0** | **¥1,780** | **¥3,980** | **¥7,380** |
| **月間クレジット** | **0** | **3** | **6** | **10** |
| **HQマスター** | — | — | — | **自動付与（0C）** |
| **強力ノイズ抑制** | — | — | — | **自動付与（0C）** |
| **ハモリ生成（オプション）** | **+0.5クレジット** | **+0.5クレジット** | **無料** | **無料** |
| **保存期限** | **7日** | **7日** | **15日** | **30日** |
| **実行優先度** | 通常 | 通常 | 優先 | 最優先 |

---

## 4. DB/設定の変更点
### 4.1 `plans.features` の追記（例）
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
- Standard/Lite/未加入は追記なし（`false` 既定）。

### 4.2 環境変数（例）
```bash
# Creator 高度処理の既定ON/OFF（運用での一時停止用）
CREATOR_HQ_MASTER_DEFAULT=1
CREATOR_DENOISE_STRONG_DEFAULT=1
# オーバーサンプリング上限・安全パラメータ
MASTER_OS_MAX=16
MASTER_TP_CEILING_DB=-1.0
DENOISE_MAX_REDUCTION_DB=14
```

---

## 5. API / I/F（差分）
- **入力（レンダー系）**：`plan` が `creator` の場合、サーバーは `advanced.enableHqMaster=true` / `advanced.enableStrongDenoise=true` を内部で付与。
- **任意トグル**：UIで OFF にした場合のみ `advanced.skipHqMaster=true` / `advanced.skipStrongDenoise=true` を送る。
- **出力（メトリクス）**：`metrics.noise_reduction_db`、`metrics.true_peak_dbTP`、`metrics.lufs_integrated` を返却。`appliedParams.advanced` に適用可否を記録。

---

## 6. Worker 要件定義（新規）
### 6.1 パイプライン差し込み位置
```
[入力DL] → [オフセット/テンポ] → [ボーカル整音(HPF/De-esser/Comp/EQ)]
 → **[強力ノイズ抑制（Creatorのみ/自動）]**
 → [合成/Rescue Ducking] → [自動微調整ループ]
 → **[HQマスター（Creatorのみ）]** → [loudnorm 2pass / Dither] → [保存]
```

### 6.2 強力ノイズ抑制（Creator）
- **適用条件**：`SNR_estimate < θ` または `床ノイズRMS > θ2` で強度↑。クリーン素材は**軽適用 or バイパス**。
- **パラメータ**（初期値）：`max_reduction=14dB`, `transient_guard=ON`, `musical_noise_guard=ON`。
- **評価**：`NR_applied_db` をメトリクス化。**子音/アタック歪み検出**時は 1 段階弱めて再試行（最大2回）。

### 6.3 HQマスター（Creator）
- **チェーン**：EQ(linear) → MBComp(5band) → ParallelSat → Stereo/MS → Limiter1 → Limiter2(OS **16x**, TP検出) → loudnorm(2pass) → Dither
- **目標**：`−14 LUFS (±0.3)` / `TP ≤ −1.0 dBTP` / 段別合計GR ≤ `6 dB`。
- **再試行**：TP超過 or LUFS未達時は Limiter2 閾値 ±0.2dB で最大3回リトライ。

### 6.4 失敗・冪等・ロールバック
- 入出力に **idempotency key**（`job.id + phase`）を付与。途中失敗は**部分再実行**。
- Worker 失敗時は API が `ledger.reversal()` を呼び、**クレジット返却**（既存ポリシー）。

### 6.5 性能・同時実行
- CreatorのHQ/強ノイズは高負荷。**同時実行スロット**を `LITE:2 / STD:2 / CREATOR:1` 目安で制御（キュー優先度：Creator>Standard>Lite>未加入）。
- **SLO**：60秒素材で **P95 180秒以内** 完了を維持。負荷に応じて OS を自動ダウングレード（16x→8x）。

### 6.6 ロギング/メトリクス
- 保存：`metrics`（`snr_before/after`, `nr_applied_db`, `lufs`, `tp`, `gr_total`）。
- 監視KPI：`再出力率`, `TP違反率`, `NRアーティファクト率`（ヒューリスティクス: 高域バズ比など）。

---

## 7. UI/表示（差分）
- 料金ページ：Creator 行に **「HQマスター/強力ノイズ抑制：自動付与（追加クレジット不要）」** の注記。
- MIXページ（Creatorのみ）：
  - トグル **［高度処理（HQ/強ノイズ）］ON/OFF**（初期 ON）。
  - ツールチップ：「素材の状態に応じて自動調整します。音が不自然な場合はOFFにしてください。」

---

## 8. 受け入れ基準（Acceptance）
1. Creator レンダーで **HQ/強ノイズが既定ON**、追加クレジット消費が**0**である。
2. `metrics` に `noise_reduction_db / lufs / true_peak_dbTP` が保存される。
3. `−14 LUFS (±0.3)`、`TP ≤ −1.0 dBTP`、`GR合計 ≤ 6dB` を**95%**以上で満たす。
4. 強ノイズ適用時に **子音つぶれ検出**で自動弱体化→再試行が行われる（最大2回）。
5. OFFトグルで HQ/強ノイズが完全にバイパスされ、通常チェーンで出力される。

---

## 9. リリース計画 / ロールバック
- **段階導入**：Creator の 10% → 50% → 100%（日次）
- 指標：`再出力率`、`TP違反率`、`NRアーティファクト率`、`処理時間`。閾値超過で `CREATOR_*_DEFAULT=0` に切替（即時停止）。

---

## 10. 補足（互換・将来拡張）
- 将来、Standard に「月×回の HQ/強ノイズ無料」枠を付与する場合：`features.addon_core_free_monthly` を流用（0.5C換算→0C化）。
- 長尺拡張（>60s）時は、HQ/強ノイズの適用を**代表区間**に限定し、全体へ係数適用。または Core 消費の逓増で整合を取る。

