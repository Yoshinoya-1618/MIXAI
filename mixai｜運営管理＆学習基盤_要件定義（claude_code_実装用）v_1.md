# MIXAI｜運営管理＆学習基盤 要件定義（Claude Code 実装用）v1.1
日付: 2025-09-09 / 対象: Next.js 15 (App Router, TS) + NextAuth + Supabase + Vercel / 付随: 外部ワーカー, Stripe, Slack, Sentry

> 目的: フィードバックや運営用データの**安全な運用管理**、および**学習データ収集～モデル適用**までを一貫する最小～本格構成を定義。Claude Code が**ディレクトリを自律決定**して実装できるよう、要件・API・DB・UI・運用を網羅。

---

## 0. スコープとゴール
- **管理者ページ（/admin 体系）**の実装: ダッシュボード/ジョブ/フィードバック/ユーザー/フラグ/監査/保管庫。
- **セキュリティ**: RBAC（roles）、2FA、RLS、監査ログ、短期署名URL、PIIマスキング、削除運用。
- **メディア運用**: inst/vocal/master の保存・プレビュー・自動削除、Admin Vault（目的限定の一時保管）。
- **学習**: オプトイン収集、30秒プレビュー中心、特徴量保存、モデル適用（推論→小型学習→A/B）。
- **非スコープ**: 決済の直接操作（返金等は Stripe ダッシュボードで実施し、管理UIはリンク集）。

---

## 1. 全体アーキテクチャ
- **フロント/SSR**: Next.js 15（App Router, TypeScript）。
- **認証**: NextAuth（Google/Email/Passkey/TOTP）。
- **DB/Storage**: Supabase（Postgres, Storage, RLS）。
- **ワーカー**: 音声処理（プレビュー/波形/ノイズ抑制/分離/整音/マスター）。
- **監視**: Sentry（エラー）, Slack（通知）, ログ基盤（任意）。
- **スケジューラ**: Vercel Cron または Supabase pg_cron（自動削除/集計）。

---

## 2. ロール＆権限（RBAC）
| ロール | 目的 | 権限（読/書） |
|---|---|---|
| `admin` | 全権 | すべて R/W |
| `ops` | 運用 | jobs/feedback/users/flags（R/W）, audit（R） |
| `support` | サポート | feedback（R/W）, users（R）, jobs（R） |
| `read_only` | 閲覧 | 主要ページ R のみ |

- ロールは `profiles.roles text[]`。NextAuth JWT に反映。`/admin` は 2FA 強制。
- 任意: IP許可制（固定IP/社内VPN）。

---

## 3. 管理者の入り方（到達動線）
- 正式入口: **`/admin`（固定URL）**。未ログインは `/auth/login?cb=/admin` へ。権限不足は 403。
- ヘッダーのユーザーメニューに「運営ダッシュボード」（**管理ロールのみ表示**）。
- Slack 固定メッセージ/ボタンから `/admin` にディープリンク。
- 将来: `https://admin.mixai.jp` へ分離可。SEOは robots `Disallow: /admin` + ページ `noindex`。
- ステップアップ認証: `/admin` 入場時に 2FA 未検証なら `/auth/verify-2fa?cb=/admin`。

---

## 4. ルーティング / 画面構成（/admin）
- `/admin` ダッシュボード: 今日のジョブ、失敗率、平均処理時間、クレジット消費、未対応フィードバック。
- `/admin/jobs`: 検索/フィルタ（ステータス/期間/プラン/ユーザー）、詳細（ログ/エラー）。再実行/キャンセル（理由必須, 監査）。
- `/admin/feedback`: 一覧（重要度/プラン/日時）、詳細、ステータス（new/investigating/resolved/rejected）、テンプレ返信。
- `/admin/users`: 検索/詳細（ロール/クレジット/2FA）、クレジット調整（理由必須, 監査）、Stripeリンク。
- `/admin/flags`: 機能フラグ on/off・ロールアウト%・更新履歴。
- `/admin/audit`: 監査ログ検索（期間/アクション/actor/エンティティ）。
- `/admin/vault`: Admin Vault（保管アイテムの検索/プレビュー/自動削除予定/法的ホールド）。

**UI共通**: 2ペイン（左=一覧/右=詳細）、危険操作は赤＋モーダル＋二段確認＋理由必須。PIIはマスク表示。CSVエクスポート、保存フィルタ、インクリメンタル検索。

---

## 5. DB スキーマ（新規/拡張）
```sql
-- 5.1 profiles に roles を追加（存在しなければ）
alter table profiles add column if not exists roles text[] not null default '{}';

-- 5.2 2FA（TOTP）
create table if not exists user_mfa (
  user_id uuid primary key,
  totp_secret text not null,
  enabled boolean not null default false,
  verified_at timestamptz
);

-- 5.3 監査ログ
create table if not exists audit_logs (
  id bigserial primary key,
  actor_id uuid not null,
  action text not null,          -- e.g. 'credits:adjust'
  entity text not null,          -- e.g. 'profiles:uuid' / 'storage:path'
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz default now()
);

-- 5.4 機能フラグ
create table if not exists feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout int not null default 100,
  updated_by uuid,
  updated_at timestamptz default now()
);

-- 5.5 Admin Vault（保管庫）
create table if not exists vault_items (
  id bigserial primary key,
  job_id uuid not null,
  user_id uuid not null,
  kind text not null check (kind in ('inst','vocal','master','preview','waveform')),
  path text not null,
  sha256 text,
  duration_sec int,
  samplerate int,
  consent text not null default 'none' check (consent in ('none','support','qa','training')),
  purpose text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  expires_at timestamptz,
  legal_hold boolean default false
);

-- 5.6 プラン別保持期間
create table if not exists retention_policies (
  plan text primary key,                  -- lite/standard/creator etc.
  days_inst int not null,
  days_vocal int not null,
  days_master int not null,
  days_preview int not null
);
```

> 既存テーブル（例: `mix_jobs`, `feedback`）が未定義の場合は Claude Code に作成を委譲。キー/インデックス/外部キーは適宜設定。

---

## 6. ストレージ構成（Supabase Storage）
- バケット（すべて**非公開**）:
  - `mix-uploads`（原本: `inst/<userId>/<jobId>.wav`, `vocal/<userId>/<jobId>.wav`）
  - `mix-outputs`（完成品: `master/<userId>/<jobId>.wav`）
  - `admin-vault`（`previews/<jobId>.m4a`, `waveforms/<jobId>.json|png` ほか）
  - 任意: `admin-temp`（目的限定コピーの一時保存）
- **命名規則**: userId/jobIdで階層化、サニタイズ済み拡張子。
- **アクセス**: 管理UIは**Server Action**経由で**短期署名URL（60–120秒）**を発行。原本閲覧は最後の手段。

---

## 7. セキュリティ / RLS 方針
- 通常は「本人のみ」読み取り可。運営は**サーバーサイド（Service Role）**経由で選択的に読み取り。
- `audit_logs` は運営のみ読み取り可。書き込みはサーバーのみ。
- 危険操作には**二段確認＋理由必須**＋監査記録。IP許可制は任意採用。
- HTTPヘッダ: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`。
- PIIはUIでマスク表示。音声配布は常に非公開＋短期署名URL。

---

## 8. 管理UIの主要機能（詳細）
- **Dashboard**: 当日ジョブ数/失敗率/平均処理時間/クレジット消費/未対応件数。閾値越えでSlack通知。
- **Jobs**: ステータス（queued/running/succeeded/failed）、再実行/キャンセル（理由必須）。失敗ログ閲覧。
- **Feedback**: ステータス管理、テンプレ返信（通知はメール/アプリ内）。
- **Users**: ロール付与、2FA 状態、クレジット調整（RPC）→監査記録。Stripeへのリンク。
- **Flags**: `enable_hq_master` 等 on/off・%ロールアウト・履歴。
- **Audit**: 期間/actor/action/entityで検索。書換・削除は不可。
- **Vault**: アイテム検索、プレビュー（先に preview、不可なら原本）、削除/法的ホールド設定、自動削除予定の一覧。

---

## 9. サーバーアクション（例）
- `getAdminPreviewUrl(path, kind)` … 120秒の署名URL生成＋監査。
- `adjustCredits(userId, delta, reason)` … クレジット調整（RPC/監査）。
- `stashOriginal(jobId, kind, purpose)` … 原本の目的限定コピー（短期・監査）。
- `toggleFlag(key, enabled, rollout)` … フラグ更新（監査）。

> すべて 2FA 済み + RBAC 満たす必要。IP許可制があれば同時検査。

---

## 10. 自動削除 / スケジューラ
- 日次バッチ: `now() > expires_at AND legal_hold=false` の `vault_items` を削除（Storage + Row）。
- 実装: Vercel Cron → API Route or Supabase Edge Function / pg_cron。
- 失敗時は Slack 通知。削除ログは監査に記録。

---

## 11. 保存期間（初期値）
- プラン別: **inst=7d / vocal=7d / master=15d / preview=30d**（編集可）。
- 完成品の恒久保存は既定で**しない**。長期保管は**同意がある案件のみ**。

---

## 12. 学習データ収集 & ガバナンス
- **UI**: アップロード時に2つの同意チェック（1) QA/品質改善 2) モデル学習）。任意・撤回可・特典（例: +0.5クレジット）。
- **データ最小化**: 30秒プレビュー + 特徴量（log-mel統計等）中心。原本は短期。重複/著作確認は指紋・ルールで除外。
- **DSR**: 「学習から外す」要求を管理画面で即反映。透明性ログ（年次概要）。
- **越境**: 将来の海外学習/推論は説明＋同意（文面テンプレを規約に反映）。

---

## 13. 既成モデルの組込み & 自作モデル
**即時組込み（推論のみ）**
- ノイズ抑制: RNNoise / DeepFilterNet / Demucs(DNS)。
- 分離: HtDemucs/MDX-Net/UVR 系。
- アライン: GCC-PHAT + DTW（librosa）。
- HQマスター: ラウドネス正規化 + リミッタ + ダイナミックEQ（DSPチェーン）。

**自作/微調整（小型モデル）**
- 目標: 「マスター値の回帰（EQ/Comp/LUFS）」「プリセット推薦」「補助アライン」。
- 学習: PyTorch→ONNX 変換→ワーカーで onnxruntime 推論。A/B は Feature Flag で段階ロールアウト。

---

## 14. ワーカー要件（音声処理）
- 入力: inst, vocal（WAV/48k, 24bit 推奨）。
- 出力: master（WAV/48k）＋ 30秒 AAC プレビュー（96kbps 目安）＋波形PNG/JSON。
- 手順: 受領→整音（任意）→アライン→ミックス→マスタ→メタ保存→Storage 書込。
- 失敗時: リトライ規則、エラーログ（管理UIから閲覧）。
- 署名URLの発行はサーバーのみ。クライアントから直接書込/読取不可。

---

## 15. ENV / 設定
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`（クライアント露出禁止）
- `ADMIN_ALLOWED_IPS`（任意, comma 区切り）
- `MFA_ISSUER`（TOTP用）
- 監視: `SENTRY_DSN`（任意） / Slack Webhook など

---

## 16. QA（受け入れ条件）
- 未ログイン `/admin` → ログイン → **/admin に復帰**する。
- RBAC: `support` は閲覧中心、`ops` で編集可、`read_only` はRのみ。
- 2FA 未設定・未検証は `/admin` 入場不可。
- 危険操作後は `audit_logs` に before/after が残る。
- `/admin/vault` で preview 先行、原本は最後の手段（監査に目的/秒数が記録）。
- 自動削除が既定日に実行され、失敗時は通知される。

---

## 17. 開発プロセス / マイグレーション順
1) DB 追加: `profiles.roles`, `user_mfa`, `audit_logs`, `feature_flags`, `vault_items`, `retention_policies`。
2) 初期データ投入: `retention_policies`（inst=7, vocal=7, master=15, preview=30）。
3) ミドルウェア/NextAuth callbacks で RBAC & 2FA。
4) `/admin` 骨組み（Nav/レイアウト/ダミーページ）。
5) Jobs/Feedback/Users → Flags → Audit → Vault の順に機能追加。
6) 自動削除ジョブ・Slack通知・Sentry連携。
7) 既成モデルの推論統合 → 小型学習モデルのA/B 適用。

---

## 18. Claude Code への指針
- **ディレクトリやファイル配置は自律決定**してよい（App Router前提）。
- ただし**Service Role を含むサーバーコードはクライアントに混ぜない**こと。
- shadcn/ui + Tailwind の採用、危険操作は `variant="destructive"` を使用。
- Supabase Storage 操作は**サーバーサイド**のみ。署名URLは 60–120秒。
- RLS/ポリシー/インデックスは適宜補完、型は `uuid`/`timestamptz` を基本。

---

## 19. 決定事項（v1.1）
**あなたの回答: すべて推奨どおり採用。以下を確定とします。**

### A. アクセス / セキュリティ
- **2FA 方式**: **Passkey + TOTP（両方）**。管理ロールは **Passkey必須**、TOTPはバックアップ。/admin 入場時は**ステップアップ認証**。
- **IP 許可制**: **Phase 2 から導入**（当面は無効）。
- **/admin のサブドメイン分離**: **Phase 2 で `admin.mixai.jp` へ分離**。
- **4‑eyes（二名承認）が必要な危険操作**:
  1) **クレジット調整**（±10以上）
  2) **ユーザー凍結/削除**
  3) **原本（inst/vocal/master）の閲覧/エクスポート**
  4) **保持期間/法的ホールド設定の変更**
  5) **Feature Flag の大規模ロールアウト（>50%）**

### B. データ保持 / 削除
- **既定保持日数（初期値）**: **inst=7日 / vocal=7日 / master=15日 / preview=30日**。
- **法的ホールドの設定権限**: **admin のみ**。
- **自動削除の実行時刻（JST）**: **03:30**。**通知先**: **#mixai-ops-alerts**。

### C. 学習同意 / 特典
- **同意テキストの調子**: **やや丁寧**。
- **特典**: **+0.5 クレジット/ジョブ**。
- **同意撤回のSLA**: **即時**で今後の学習から除外、**24h以内**に学習用派生データ（プレビュー/特徴量）削除。
- **海外リージョンでの学習/推論**: **許容（APPI越境説明を明記）**。

### D. モデル適用の優先順位
- **既成機能の導入順**: **HQマスター（DSP） → アライン（GCC‑PHAT+DTW） → ノイズ抑制（RNNoise/DeepFilterNet） → 分離（HTDemucs/MDX）**。
- **小型学習モデルの第一弾（優先順）**: **① マスター値回帰 → ② プリセット推薦 → ③ 補助アライン**。
- **A/B ロールアウト**: **5% → 25% → 100%**（指標悪化時は即ロールバック）。

### E. 運用 / Slack
- **通知チャンネル**: **#mixai-ops-alerts（障害/削除）**, **#mixai-ml-alerts（学習/精度）**, **#mixai-billing（課金）**, **#mixai-admin（承認）**。
- **初期ロール構成**: **admin**（あなた＋最大1名）, **ops**（1–3名）, **support**（1–2名）※個人名はTBD。

### F. UI / UX
- **/admin/vault プレビュー秒数**: **90秒**（署名URLは120秒程度）。
- **CSV エクスポート対象**: **jobs / users / feedback / vault**（**PIIはマスク**）。
- **PII マスク仕様**: メール `ab****@domain`, 電話 `090-****-**34`, 氏名 `Y. Yoshino` 形式。**一時表示には監査記録**。

### G. 規約 / ポリシー
- **改定タイミング**: **公開前**（最低限整備）→ **β公開時**（学習/撤回/越境を明文化）→ **本公開時**（実運用反映）。
- **透明性レポート**: **/policy/transparency** に年次公開。

### H. インフラ / 費用
- **ワーカー実行環境**: **CPU基盤を基本**、分離/Deep系は**必要時のみGPU**（A10/T4等）。
- **月額コスト上限（初期目安）**: **¥30,000–¥80,000**。
- **Storage 上限（初期）**: **200GB–1TB**。**80%**で警告、**90%**で自動クリーン、**95%**でアップロード制限＋案内。

---

## 20. 次アクション（推奨）
1) A/B 優先度と学習同意方針（ヒアリング）を確定。
2) DBマイグレーション適用 & 初期データ投入。
3) middleware / auth callbacks / /admin 骨組みを生成。
4) Jobs/Feedback/Users → Flags → Audit → Vault の順で機能実装。
5) 自動削除ジョブ & Slack 通知、Sentry連携。
6) 既成モデル推論 → 小型学習モデル試作 → ONNX → A/B。

---

## 21. コスト最小バージョン（CPU学習モード / No‑GPU）
**目的**: GPU を使わず、最短で“体感価値”を出す構成。**DSP 先行 + 軽量学習（CPU） + ONNX 配備**で、月額ランニングを最小化。

### 21.1 スコープ（含む / 含まない）
- **含む**
  - **HQマスター（DSP）**: EBU R128 正規化 → コンプレッサ → ソフトリミッタ → シェルフEQ。
  - **自動アライン**: GCC‑PHAT + DTW（librosa, CPU）。
  - **軽量学習（CPU）**:
    - **マスター値回帰**（低域/高域EQ, comp量, 目標LUFS）… Ridge/ElasticNet + StandardScaler。
    - **プリセット推薦**（曲調×歌声→候補）… Logistic Regression（One‑vs‑Rest）or LightGBM CPU。
    - **アライン信頼度分類**（任意）。
  - **ONNX 配備**: skl2onnx → onnxruntime（CPU）。
  - **30秒プレビュー/波形/特徴量**の生成・保存（原音は既定保持日数で自動削除）。
- **含まない**（初期は OFF）
  - ボーカル分離や Deep ノイズの**学習**（推論は必要時のみ・既成モデル/外部に委譲）。
  - GPU を前提にした重い学習・蒸留・ハイパラ大量探索。

### 21.2 データ / 特徴量
- 収集対象: **30–60秒プレビュー**（オプトイン）、メタ（BPM/キー任意）。
- 特徴量（CPUで高速）: log‑mel mean/std（64帯×2=128次元）＋RMS/ZCR/centroid/rolloff mean/std＋**LUFS/LRA/crest** → 計 **~160 次元** 目安。
- 保存: **特徴量のみ長期**（JSONB/Parquet）、原音は保持日数で削除。重複は指紋で排除（任意）。

### 21.3 学習パイプライン（CPU）
- ライブラリ: `librosa`, `pyloudnorm`, `scikit‑learn`, `lightgbm`（CPU版）, `skl2onnx`。
- 手順: 特徴量抽出 → StandardScaler → **Ridge/LogReg** 学習 → 5‑fold 検証 → **ONNX** 書き出し。
- スケジュール: **週1回（日曜 04:00 JST）** 再学習。新着100件ごとに `SGD* .partial_fit` の**部分学習**可。
- モデル管理: `model_type/version/yyyyMMdd` 命名、メトリクスと一緒に `/admin/audit` へ記録。

### 21.4 ワーカー / 配備
- 推論: **Node ワーカー + onnxruntime‑node（CPU）**。バッチ=1、同期推論。タイムアウト/リトライ設定。
- 依存: `ffmpeg`, `sox`（任意）, `pyloudnorm`。
- 同時実行: 1–2並列（Vercel/関数 or 小型VM）。負荷上昇時はキューで平準化。

### 21.5 成本ガード（初期目安）
- **月額上限**: **¥10,000** 目安（Storage/関数実行/ネットワーク含む）。
- しきい値: Storage 使用率 **80/90/95%** で 段階抑制（プレビュー縮退→古い順削除→アップロード制限）。
- Egress 抑制: プレビューは **96kbps/mono**、署名URL **120秒**、管理UIは**自動プリロード禁止**。

### 21.6 フラグ / UI 差分
- Feature Flags 既定: `enable_hq_master=on`, `enable_align=on`, `enable_cpu_ml=on`, `enable_deep_sep=off`。
- `/admin/vault` 既定プレビュー = **90秒**。原本閲覧/エクスポートは二名承認（4‑eyes）。

### 21.7 受け入れ条件（CPU最小）
1) GPU 無しで**ジョブ完了**（DSP + アライン + 推論）できる。  
2) **回帰/推薦モデル**の推論が onnxruntime（CPU）で < **50ms/件**（平均）で完了。  
3) 週次再学習が **5分以内**（5k〜20k クリップ, 8 コア想定）。  
4) 原音は既定保持日数で**自動削除**、特徴量のみ長期保存。  
5) `/admin` で A/B（5%→25%→100%）とメトリクス（MAE/F1・失敗率・処理時間）が可視化。  
6) コスト上限 **¥10,000/月** を超える前に Slack 警告が出る。

### 21.8 Claude Code 実装タスクリスト（最小）
1) **特徴量抽出ジョブ**（CPU）をワーカーに追加（librosa+pyloudnorm）。
2) **学習スクリプト**（scikit‑learn）と **ONNX 変換**（skl2onnx）を `scripts/train_minimal.py` として追加。  
3) **推論モジュール**（onnxruntime‑node, CPU）をワーカーに実装。  
4) `/admin/flags` に `enable_cpu_ml` を追加、A/B 割当 UI を用意。  
5) **週次学習 Cron**（日曜 04:00 JST）と **日次削除 Cron**（03:30 JST）を作成。  
6) `/admin` ダッシュボードに **MAE/F1・処理時間・失敗率** を表示。  
7) Storage/Egress の**段階抑制**ロジックとアラート（#mixai‑ops‑alerts）。

---

（以上を満たせば、GPUなしでも“AIあり”体験を提供できます。必要に応じて Phase 2 で Deep 系推論/学習を段階導入します。）

