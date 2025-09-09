# AI/ML機能実装ガイド

## 概要
MIXAI に CPU ベースの機械学習機能を実装しました。この機能により、ユーザーの利用データから学習し、より高品質な MIX パラメータの推定が可能になります。

## アーキテクチャ

### 1. 特徴量抽出 (`worker/features.ts`)
音声ファイルから以下の特徴量を抽出（合計約160次元）：
- **スペクトル特徴量**: 重心、ロールオフ、フラックス、コントラスト（7バンド）、帯域幅
- **時間領域特徴量**: ゼロ交差率、RMSエネルギー、テンポ、ビート強度
- **MFCC**: 13次元 × 4統計値
- **クロマベクトル**: 12次元 × 4統計値
- **ラウドネス**: LUFS（統合/短期/瞬間）、LRA、True Peak

### 2. 学習パイプライン (`worker/training.ts`)
3つのタスクに対応：
- **master_reg**: マスタリングパラメータの回帰推定
- **preset_cls**: プリセットの分類推薦
- **align_conf**: アライメント信頼度の推定

### 3. 推論エンジン (`worker/inference.ts`)
- ONNX Runtime によるCPU推論
- モデルキャッシング（最大5モデル）
- A/Bテスト対応
- フォールバック機構（ML失敗時はルールベース）

## データベース構造

### 主要テーブル
```sql
features_store    -- 特徴量ベクトルの保存
labels           -- 教師データ
model_registry   -- モデルバージョン管理
model_metrics    -- オンライン性能計測
training_jobs    -- 学習ジョブ管理
ml_consent       -- ユーザー同意管理
ml_exclusions    -- 除外リスト
ab_test_assignments -- A/Bテスト割り当て
ab_test_metrics  -- A/Bテストメトリクス
```

## セットアップ

### 1. 環境変数
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Cron認証（Vercel）
CRON_SECRET=your_cron_secret

# ML設定
ENABLE_CPU_ML=false  # 初期は無効
ML_MIN_SAMPLES=1000  # 最小学習サンプル数
```

### 2. データベースマイグレーション
```bash
# Supabase CLIを使用
npx supabase db push

# または管理画面から実行
# 1. 20250110_create_ai_learning_tables.sql
# 2. 20250110_add_trimmed_inst_path.sql
# 3. 20250110_add_ml_inference_columns.sql
```

### 3. 依存パッケージのインストール
```bash
npm install @tensorflow/tfjs-node onnxruntime-node web-audio-api
```

## 運用

### フィーチャーフラグ管理
管理画面 (`/admin/ml`) から以下を制御：
- `enable_cpu_ml`: ML機能全体のON/OFF
- `enable_master_regression`: マスタリング推定
- `enable_preset_recommendation`: プリセット推薦
- `enable_align_confidence`: アライメント信頼度

### A/Bテスト
1. モデルのロールアウト率を0-100%で調整
2. ユーザーIDのハッシュ値による決定的割り当て
3. メトリクスの自動収集と統計的有意性の判定

### 定期学習
Vercel Cron により毎週日曜日3時に自動実行：
```json
{
  "path": "/api/cron/train",
  "schedule": "0 3 * * 0"
}
```

### 手動学習
```bash
# 全タスクの学習
npm run train:ml

# 特定タスクの学習
npm run train:ml master_reg
```

## プライバシーとコンプライアンス

### ユーザー同意
- `ml_consent` テーブルで同意状態を管理
- 同意撤回時は24時間以内にデータ削除

### データ除外
- `ml_exclusions` で特定データを学習から除外
- 理由: withdrawal（撤回）、quality（品質）、legal_hold（法的保留）、manual（手動）

## 性能とスケーラビリティ

### CPU最適化
- TensorFlow.js の CPU バックエンド使用
- ONNX Runtime の最適化設定
- 特徴量抽出の並列処理

### キャッシング
- モデルキャッシュ（メモリ内、最大5モデル）
- 推論結果のDB保存
- 特徴量の再利用

### メトリクス監視
- 平均レイテンシ（1時間/1日/7日/30日）
- エラー率
- 精度メトリクス（MAE、RMSE、R²、F1スコア等）

## トラブルシューティング

### ML推論が動作しない
1. フィーチャーフラグを確認
2. モデルがアクティブか確認
3. ロールアウト率を確認

### 学習が失敗する
1. データ数が十分か確認（最小1000サンプル）
2. 同意済みユーザーのデータか確認
3. メモリ不足の場合はバッチサイズを調整

### A/Bテストの結果が偏る
1. サンプルサイズを確認
2. ユーザー割り当てのバランスを確認
3. 実験期間が十分か確認

## 今後の拡張計画

### Phase B: GPU対応
- CUDA/WebGPU バックエンド
- リアルタイム推論
- より大規模なモデル

### Phase C: エッジAI
- WebAssembly での推論
- オフライン対応
- プライバシー強化

### Phase D: 高度な学習
- 転移学習
- ファインチューニング
- マルチタスク学習