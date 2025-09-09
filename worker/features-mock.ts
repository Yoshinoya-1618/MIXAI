// worker/features-mock.ts
// モック版の特徴量抽出（本番環境では実際の実装を使用）

export interface AudioFeatures {
  spectral: {
    centroid: number[]
    rolloff: number[]
    flux: number[]
    contrast: number[]
    bandwidth: number[]
  }
  temporal: {
    zcr: number[]
    rms: number[]
    tempo: number
    beat_strength: number
  }
  mfcc: number[][]
  chroma: number[][]
  loudness: {
    lufs_i: number
    lufs_s: number
    lufs_m: number
    lra: number
    true_peak: number
  }
  stats: {
    duration: number
    sample_rate: number
    channels: number
    bit_depth: number
  }
}

/**
 * 音声バッファから特徴量を抽出（モック版）
 */
export async function extractFeatures(
  audioBuffer: ArrayBuffer,
  clipKind: 'inst' | 'vocal' | 'mix'
): Promise<{ vec: number[]; stats: any }> {
  
  // モック特徴量を生成（160次元）
  const vec: number[] = []
  
  // ランダムだが決定的な値を生成（バッファサイズに基づく）
  const seed = audioBuffer.byteLength % 1000
  const random = (i: number) => ((seed + i) * 9973 % 1000) / 1000
  
  // スペクトル特徴量（27次元）
  for (let i = 0; i < 27; i++) {
    vec.push(random(i))
  }
  
  // 時間領域特徴量（10次元）
  for (let i = 27; i < 37; i++) {
    vec.push(random(i))
  }
  
  // MFCC（52次元）
  for (let i = 37; i < 89; i++) {
    vec.push(random(i))
  }
  
  // クロマ（48次元）
  for (let i = 89; i < 137; i++) {
    vec.push(random(i))
  }
  
  // ラウドネス（5次元）
  for (let i = 137; i < 142; i++) {
    vec.push(random(i))
  }
  
  // クリップ種別エンコーディング（3次元）
  vec.push(clipKind === 'inst' ? 1 : 0)
  vec.push(clipKind === 'vocal' ? 1 : 0)
  vec.push(clipKind === 'mix' ? 1 : 0)
  
  // 追加のパディング（160次元まで）
  while (vec.length < 160) {
    vec.push(0)
  }
  
  // 統計情報（モック）
  const stats = {
    lufs_i: -14 + random(1000) * 4,
    lra: 7 + random(1001) * 3,
    true_peak: -1 + random(1002) * 0.5,
    tempo: 100 + random(1003) * 40,
    duration: audioBuffer.byteLength / 44100 / 2, // 推定
    sample_rate: 44100
  }
  
  return { vec, stats }
}

/**
 * 特徴量をSupabaseに保存
 */
export async function saveFeaturesToDB(
  jobId: string,
  userId: string,
  clipKind: 'inst' | 'vocal' | 'mix',
  features: { vec: number[]; stats: any },
  supabase: any
): Promise<void> {
  const { error } = await supabase
    .from('features_store')
    .insert({
      job_id: jobId,
      user_id: userId,
      clip_kind: clipKind,
      n_dim: features.vec.length,
      vec: features.vec,
      stats: features.stats
    })
  
  if (error) {
    console.error('Failed to save features:', error)
    throw error
  }
}