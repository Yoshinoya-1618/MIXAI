/**
 * 処理精度設定 - プラン別の処理品質差別化
 * CLAUDE.md v2.2準拠
 */

export type ProcessingAccuracy = 'standard' | 'high' | 'ultra-high'
export type PlanCode = 'freetrial' | 'prepaid' | 'lite' | 'standard' | 'creator'

/**
 * プラン別処理精度マッピング
 */
export const PLAN_ACCURACY_MAP: Record<PlanCode, ProcessingAccuracy> = {
  freetrial: 'ultra-high',  // Creator相当
  prepaid: 'high',          // Standard相当
  lite: 'standard',
  standard: 'high',
  creator: 'ultra-high'
}

/**
 * 処理精度パラメータ
 */
export interface AccuracyParams {
  // AI解析精度
  aiAnalysis: {
    fftSize: number           // FFTサイズ（周波数分解能）
    hopSize: number           // ホップサイズ（時間分解能）
    windowFunction: string    // 窓関数
    multiResolution: boolean  // マルチレゾリューション解析
    harmonicTracking: boolean // ハーモニクストラッキング
    transientDetection: boolean // トランジェント検出
  }
  
  // ボーカル分離精度
  vocalSeparation: {
    model: 'basic' | 'enhanced' | 'professional'
    iterations: number        // 分離処理の反復回数
    maskRefinement: boolean   // マスクリファインメント
    phaseRecovery: boolean    // 位相復元
    residualProcessing: boolean // 残差処理
  }
  
  // MIX処理精度
  mixProcessing: {
    sampleRate: number        // 内部処理サンプルレート
    bitDepth: number          // 内部処理ビット深度
    oversampling: number      // オーバーサンプリング倍率
    dithering: boolean        // ディザリング
    linearPhaseEq: boolean    // リニアフェーズEQ
    lookaheadMs: number       // ルックアヘッド時間
  }
  
  // マスタリング精度
  mastering: {
    limiterQuality: 'basic' | 'transparent' | 'pristine'
    truePeakLimiting: boolean
    loudnessNormalization: boolean
    adaptiveDynamics: boolean
    multibandsCompression: number // マルチバンド数
    harmonicExcitation: boolean
  }
  
  // 出力品質
  output: {
    format: 'mp3' | 'wav' | 'flac'
    bitrate: number           // MP3の場合のビットレート
    sampleRate: number        // 出力サンプルレート
    normalizeLevel: number    // ノーマライズレベル (LUFS)
  }
}

/**
 * 標準精度設定（Liteプラン）
 */
export const STANDARD_ACCURACY: AccuracyParams = {
  aiAnalysis: {
    fftSize: 2048,
    hopSize: 512,
    windowFunction: 'hann',
    multiResolution: false,
    harmonicTracking: false,
    transientDetection: false
  },
  vocalSeparation: {
    model: 'basic',
    iterations: 1,
    maskRefinement: false,
    phaseRecovery: false,
    residualProcessing: false
  },
  mixProcessing: {
    sampleRate: 44100,
    bitDepth: 16,
    oversampling: 1,
    dithering: false,
    linearPhaseEq: false,
    lookaheadMs: 5
  },
  mastering: {
    limiterQuality: 'basic',
    truePeakLimiting: false,
    loudnessNormalization: true,
    adaptiveDynamics: false,
    multibandsCompression: 3,
    harmonicExcitation: false
  },
  output: {
    format: 'mp3',
    bitrate: 192,
    sampleRate: 44100,
    normalizeLevel: -14
  }
}

/**
 * 高精度設定（Standard/Prepaidプラン）
 */
export const HIGH_ACCURACY: AccuracyParams = {
  aiAnalysis: {
    fftSize: 4096,
    hopSize: 256,
    windowFunction: 'blackman-harris',
    multiResolution: true,
    harmonicTracking: true,
    transientDetection: false
  },
  vocalSeparation: {
    model: 'enhanced',
    iterations: 2,
    maskRefinement: true,
    phaseRecovery: false,
    residualProcessing: true
  },
  mixProcessing: {
    sampleRate: 48000,
    bitDepth: 24,
    oversampling: 2,
    dithering: true,
    linearPhaseEq: false,
    lookaheadMs: 10
  },
  mastering: {
    limiterQuality: 'transparent',
    truePeakLimiting: true,
    loudnessNormalization: true,
    adaptiveDynamics: true,
    multibandsCompression: 5,
    harmonicExcitation: false
  },
  output: {
    format: 'wav',
    bitrate: 320,
    sampleRate: 48000,
    normalizeLevel: -14
  }
}

/**
 * 超高精度設定（Creator/FreeTrialプラン）
 */
export const ULTRA_HIGH_ACCURACY: AccuracyParams = {
  aiAnalysis: {
    fftSize: 8192,
    hopSize: 128,
    windowFunction: 'kaiser',
    multiResolution: true,
    harmonicTracking: true,
    transientDetection: true
  },
  vocalSeparation: {
    model: 'professional',
    iterations: 3,
    maskRefinement: true,
    phaseRecovery: true,
    residualProcessing: true
  },
  mixProcessing: {
    sampleRate: 96000,
    bitDepth: 32,
    oversampling: 4,
    dithering: true,
    linearPhaseEq: true,
    lookaheadMs: 20
  },
  mastering: {
    limiterQuality: 'pristine',
    truePeakLimiting: true,
    loudnessNormalization: true,
    adaptiveDynamics: true,
    multibandsCompression: 8,
    harmonicExcitation: true
  },
  output: {
    format: 'flac',
    bitrate: 320,
    sampleRate: 48000,
    normalizeLevel: -14
  }
}

/**
 * プランコードから処理精度パラメータを取得
 */
export function getAccuracyParams(planCode: PlanCode): AccuracyParams {
  const accuracy = PLAN_ACCURACY_MAP[planCode]
  
  switch (accuracy) {
    case 'standard':
      return STANDARD_ACCURACY
    case 'high':
      return HIGH_ACCURACY
    case 'ultra-high':
      return ULTRA_HIGH_ACCURACY
    default:
      return STANDARD_ACCURACY
  }
}

/**
 * 処理精度の説明を取得
 */
export function getAccuracyDescription(accuracy: ProcessingAccuracy): string {
  switch (accuracy) {
    case 'standard':
      return '基本的なMIX処理。趣味レベルの音楽制作に最適。'
    case 'high':
      return 'バランスの取れた高品質処理。配信やSNS投稿に適した品質。'
    case 'ultra-high':
      return 'プロフェッショナル品質のAI解析・MIX処理。商用利用も可能な最高品質。'
    default:
      return ''
  }
}

/**
 * 処理精度による推定処理時間の倍率
 */
export function getProcessingTimeMultiplier(accuracy: ProcessingAccuracy): number {
  switch (accuracy) {
    case 'standard':
      return 1.0
    case 'high':
      return 1.5
    case 'ultra-high':
      return 2.5
    default:
      return 1.0
  }
}

/**
 * 処理精度による品質スコア（0-100）
 */
export function getQualityScore(accuracy: ProcessingAccuracy): number {
  switch (accuracy) {
    case 'standard':
      return 70
    case 'high':
      return 85
    case 'ultra-high':
      return 100
    default:
      return 70
  }
}