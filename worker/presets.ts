/**
 * MIXプリセット定義 - CLAUDE.md準拠
 * 12種類のプリセット（Basic/Pop/Studio）
 */

export type PresetCategory = 'basic' | 'pop' | 'studio'
export type PresetKey = 
  // Basic (3)
  | 'clean_light' | 'soft_room' | 'vocal_lift_lite'
  // Pop (4)  
  | 'wide_pop' | 'warm_ballad' | 'rap_tight' | 'idol_bright'
  // Studio (5)
  | 'studio_shine' | 'airy_sparkle' | 'live_stage' | 'vintage_warm' | 'night_chill'

export interface PresetParams {
  // ボーカル処理パラメータ
  highpass: number        // Hz: ハイパスフィルタ
  lowpass?: number        // Hz: ローパスフィルタ（optional）
  deesser: number         // 0-10: De-esser強度
  compThreshold: number   // dB: コンプレッサー閾値
  compRatio: number       // 比率: 2.0 = 2:1
  compAttack: number      // ms: アタック時間
  compRelease: number     // ms: リリース時間
  
  // EQ パラメータ（ParamEQ相当）
  eq: {
    freq: number          // Hz: 中心周波数
    gain: number          // dB: ゲイン
    q: number             // Q値: 品質係数
  }[]
  
  // リバーブパラメータ
  reverbDecay: number     // 0.0-1.0: ディケイ時間
  reverbMix: number       // 0.0-1.0: リバーブミックス量
  
  // ミックスバランス
  vocalWeight: number     // 0.0-1.0: ボーカル音量ウェイト
  instWeight: number      // 0.0-1.0: 伴奏音量ウェイト
  
  // メタデータ
  category: PresetCategory
  displayName: string
  description: string
}

/**
 * 全プリセット定義
 */
export const MIX_PRESETS: Record<PresetKey, PresetParams> = {
  // ========== Basic Category (3) ==========
  clean_light: {
    category: 'basic',
    displayName: 'Clean Light',
    description: 'クリアで軽やかな音質。初心者におすすめ',
    
    // ボーカル処理
    highpass: 85,
    deesser: 4,
    compThreshold: -20,
    compRatio: 2.0,
    compAttack: 15,
    compRelease: 120,
    
    // EQ: 軽めの調整
    eq: [
      { freq: 3500, gain: 1.5, q: 1.2 },   // 存在感UP
      { freq: 12000, gain: 1.0, q: 0.8 }   // 軽い輝き
    ],
    
    // リバーブ: 控えめ
    reverbDecay: 0.15,
    reverbMix: 0.08,
    
    // ミックス
    vocalWeight: 0.65,
    instWeight: 0.55,
  },

  soft_room: {
    category: 'basic', 
    displayName: 'Soft Room',
    description: '温かみのある部屋の響き',
    
    highpass: 90,
    deesser: 3,
    compThreshold: -18,
    compRatio: 1.8,
    compAttack: 20,
    compRelease: 150,
    
    eq: [
      { freq: 800, gain: -0.5, q: 1.0 },    // 軽いローミッド削減
      { freq: 2800, gain: 1.0, q: 1.5 },    // 温かみ
      { freq: 8000, gain: -0.5, q: 0.9 }    // ソフトに
    ],
    
    reverbDecay: 0.25,
    reverbMix: 0.12,
    
    vocalWeight: 0.60,
    instWeight: 0.58,
  },

  vocal_lift_lite: {
    category: 'basic',
    displayName: 'Vocal Lift Lite',
    description: 'ボーカルを前面に出す軽めの設定',
    
    highpass: 95,
    deesser: 5,
    compThreshold: -16,
    compRatio: 2.2,
    compAttack: 12,
    compRelease: 100,
    
    eq: [
      { freq: 1200, gain: -1.0, q: 2.0 },   // マッド削減
      { freq: 4200, gain: 2.0, q: 1.3 },    // 前に出す
      { freq: 10000, gain: 1.5, q: 1.0 }    // 明瞭感
    ],
    
    reverbDecay: 0.10,
    reverbMix: 0.05,
    
    vocalWeight: 0.75,
    instWeight: 0.45,
  },

  // ========== Pop Category (4) ==========
  wide_pop: {
    category: 'pop',
    displayName: 'Wide Pop',
    description: '広がりのあるポップサウンド',
    
    highpass: 80,
    deesser: 6,
    compThreshold: -14,
    compRatio: 2.5,
    compAttack: 10,
    compRelease: 80,
    
    eq: [
      { freq: 250, gain: -1.5, q: 1.8 },    // ローエンド整理
      { freq: 3200, gain: 1.8, q: 1.0 },    // ポップ感
      { freq: 6500, gain: 1.2, q: 0.9 },    // 明るさ
      { freq: 13000, gain: 2.0, q: 0.7 }    // エアー感
    ],
    
    reverbDecay: 0.30,
    reverbMix: 0.15,
    
    vocalWeight: 0.70,
    instWeight: 0.50,
  },

  warm_ballad: {
    category: 'pop',
    displayName: 'Warm Ballad', 
    description: '温かみのあるバラード向け',
    
    highpass: 75,
    deesser: 3,
    compThreshold: -18,
    compRatio: 1.6,
    compAttack: 25,
    compRelease: 200,
    
    eq: [
      { freq: 600, gain: 0.5, q: 1.2 },     // 温かみ
      { freq: 2000, gain: 1.5, q: 1.5 },    // 親密感
      { freq: 5000, gain: 0.8, q: 1.1 },    // 自然な明るさ
      { freq: 9000, gain: -0.8, q: 0.8 }    // 刺激軽減
    ],
    
    reverbDecay: 0.40,
    reverbMix: 0.18,
    
    vocalWeight: 0.68,
    instWeight: 0.52,
  },

  rap_tight: {
    category: 'pop',
    displayName: 'Rap Tight',
    description: 'ラップ・ヒップホップ向けタイトサウンド',
    
    highpass: 100,
    deesser: 7,
    compThreshold: -12,
    compRatio: 3.0,
    compAttack: 5,
    compRelease: 50,
    
    eq: [
      { freq: 150, gain: -2.0, q: 2.0 },    // ローエンド大幅削減
      { freq: 1800, gain: 2.5, q: 2.5 },    // アタック強調
      { freq: 4500, gain: 1.8, q: 1.4 },    // 子音クリア
      { freq: 8000, gain: 2.2, q: 1.0 }     // プレゼンス
    ],
    
    reverbDecay: 0.05,  // 非常に短い
    reverbMix: 0.02,    // ほぼドライ
    
    vocalWeight: 0.80,
    instWeight: 0.40,
  },

  idol_bright: {
    category: 'pop',
    displayName: 'Idol Bright',
    description: 'アイドル楽曲向けの明るく華やかなサウンド',
    
    highpass: 85,
    deesser: 4,
    compThreshold: -15,
    compRatio: 2.3,
    compAttack: 8,
    compRelease: 70,
    
    eq: [
      { freq: 400, gain: -1.0, q: 1.5 },    // マッド削減
      { freq: 2800, gain: 2.2, q: 1.2 },    // キラキラ感
      { freq: 5500, gain: 2.8, q: 1.0 },    // 明るさ大幅UP
      { freq: 12000, gain: 3.0, q: 0.8 },   // 華やかさ
      { freq: 16000, gain: 1.5, q: 0.6 }    // 空気感
    ],
    
    reverbDecay: 0.20,
    reverbMix: 0.12,
    
    vocalWeight: 0.72,
    instWeight: 0.48,
  },

  // ========== Studio Category (5) ==========
  studio_shine: {
    category: 'studio',
    displayName: 'Studio Shine',
    description: 'スタジオクオリティの輝きのあるサウンド',
    
    highpass: 70,
    lowpass: 18000,     // 高域制御
    deesser: 5,
    compThreshold: -16,
    compRatio: 2.8,
    compAttack: 7,
    compRelease: 90,
    
    eq: [
      { freq: 120, gain: -1.8, q: 2.2 },    // ローエンド精密制御
      { freq: 800, gain: -0.8, q: 3.0 },    // マッド削減精密
      { freq: 3800, gain: 1.5, q: 1.8 },    // プレゼンス
      { freq: 7500, gain: 2.0, q: 1.2 },    // 輝き
      { freq: 11500, gain: 1.8, q: 0.9 },   // エアー
      { freq: 15000, gain: 1.0, q: 0.7 }    // 最高域
    ],
    
    reverbDecay: 0.22,
    reverbMix: 0.10,
    
    vocalWeight: 0.74,
    instWeight: 0.46,
  },

  airy_sparkle: {
    category: 'studio',
    displayName: 'Airy Sparkle',
    description: '空気感と煌めきを重視',
    
    highpass: 65,
    deesser: 4,
    compThreshold: -17,
    compRatio: 2.1,
    compAttack: 12,
    compRelease: 110,
    
    eq: [
      { freq: 200, gain: -1.2, q: 1.8 },    // クリーン
      { freq: 1500, gain: 0.8, q: 1.5 },    // 中域の自然さ
      { freq: 6000, gain: 1.8, q: 1.0 },    // 煌めき
      { freq: 10000, gain: 2.5, q: 0.8 },   // スパークル
      { freq: 14000, gain: 2.0, q: 0.6 },   // 空気感
      { freq: 18000, gain: 1.0, q: 0.5 }    // 超高域
    ],
    
    reverbDecay: 0.35,
    reverbMix: 0.14,
    
    vocalWeight: 0.69,
    instWeight: 0.51,
  },

  live_stage: {
    category: 'studio',
    displayName: 'Live Stage',
    description: 'ライブステージの臨場感',
    
    highpass: 90,
    deesser: 6,
    compThreshold: -14,
    compRatio: 2.6,
    compAttack: 15,
    compRelease: 130,
    
    eq: [
      { freq: 300, gain: 0.5, q: 1.0 },     // 体感
      { freq: 1200, gain: -0.5, q: 2.0 },   // マイク感軽減
      { freq: 3000, gain: 2.2, q: 1.5 },    // ステージプレゼンス
      { freq: 6000, gain: 1.5, q: 1.2 },    // 明瞭感
      { freq: 9000, gain: 1.0, q: 1.0 }     // ライブ感
    ],
    
    reverbDecay: 0.50,  // 長めのリバーブ
    reverbMix: 0.20,
    
    vocalWeight: 0.76,
    instWeight: 0.44,
  },

  vintage_warm: {
    category: 'studio',
    displayName: 'Vintage Warm',
    description: 'ヴィンテージ機材のような温かみ',
    
    highpass: 95,
    lowpass: 15000,     // ヴィンテージ感のため高域制限
    deesser: 3,
    compThreshold: -20,
    compRatio: 1.8,
    compAttack: 30,
    compRelease: 180,
    
    eq: [
      { freq: 100, gain: 1.0, q: 0.8 },     // 低域の重み
      { freq: 500, gain: 1.2, q: 1.2 },     // 温かみの中心
      { freq: 1800, gain: 1.5, q: 1.8 },    // ヴィンテージ感
      { freq: 4000, gain: 0.5, q: 1.5 },    // 控えめプレゼンス
      { freq: 8000, gain: -1.0, q: 1.0 }    // 高域抑制
    ],
    
    reverbDecay: 0.45,
    reverbMix: 0.16,
    
    vocalWeight: 0.66,
    instWeight: 0.54,
  },

  night_chill: {
    category: 'studio',
    displayName: 'Night Chill',
    description: '夜の落ち着いたチル系サウンド',
    
    highpass: 80,
    deesser: 2,        // 最小限
    compThreshold: -22,
    compRatio: 1.5,
    compAttack: 40,
    compRelease: 250,
    
    eq: [
      { freq: 150, gain: 0.8, q: 1.0 },     // 深み
      { freq: 800, gain: -0.5, q: 1.5 },    // マッド軽減
      { freq: 2500, gain: 0.8, q: 2.0 },    // 優しい存在感
      { freq: 6000, gain: -1.5, q: 1.2 },   // 刺激軽減
      { freq: 12000, gain: -2.0, q: 0.8 }   // 非常にソフト
    ],
    
    reverbDecay: 0.60,  // 長いリバーブ
    reverbMix: 0.22,
    
    vocalWeight: 0.62,
    instWeight: 0.58,
  },
}

/**
 * カテゴリ別プリセット取得
 */
export function getPresetsByCategory(category: PresetCategory): PresetKey[] {
  return Object.keys(MIX_PRESETS).filter(
    key => MIX_PRESETS[key as PresetKey].category === category
  ) as PresetKey[]
}

/**
 * プリセット一覧取得（プラン別対応）
 */
export function getPresetsForPlan(planCode: 'lite' | 'standard' | 'creator'): PresetKey[] {
  const allPresets = Object.keys(MIX_PRESETS) as PresetKey[]
  
  switch (planCode) {
    case 'lite':
      // Basic 3種のみ
      return allPresets.filter(key => MIX_PRESETS[key].category === 'basic')
      
    case 'standard':
      // Basic + Pop = 7種
      return allPresets.filter(key => 
        ['basic', 'pop'].includes(MIX_PRESETS[key].category)
      )
      
    case 'creator':
      // 全12種
      return allPresets
      
    default:
      return []
  }
}

/**
 * プリセットパラメータ取得
 */
export function getPresetParams(presetKey: PresetKey): PresetParams {
  const preset = MIX_PRESETS[presetKey]
  if (!preset) {
    throw new Error(`Unknown preset: ${presetKey}`)
  }
  return preset
}

/**
 * デフォルトプリセット取得（プラン別）
 */
export function getDefaultPreset(planCode: 'lite' | 'standard' | 'creator'): PresetKey {
  switch (planCode) {
    case 'lite':
      return 'clean_light'
    case 'standard':
      return 'wide_pop'
    case 'creator':
      return 'studio_shine'
    default:
      return 'clean_light'
  }
}