// worker/inference-mock.ts
// モック版の推論モジュール（本番環境では実際の実装を使用）

import { supabase } from '../lib/supabase'
import { extractFeatures, saveFeaturesToDB } from './features-mock'

export interface InferenceInput {
  jobId: string
  userId: string
  audioBuffers: {
    inst?: ArrayBuffer
    vocal?: ArrayBuffer
    mix?: ArrayBuffer
  }
}

export interface InferenceResult {
  masterParams?: {
    lowShelfDb: number
    highShelfDb: number
    compDb: number
    targetLufs: number
  }
  presetId?: string
  alignConfidence?: number
  metadata: {
    modelVersion: string
    inferenceTimeMs: number
    featureExtractionTimeMs: number
  }
}

/**
 * AI推論の実行（モック版）
 */
export async function runInference(
  input: InferenceInput,
  tasks: Array<'master_reg' | 'preset_cls' | 'align_conf'>
): Promise<InferenceResult> {
  
  const startTime = Date.now()
  const result: InferenceResult = {
    metadata: {
      modelVersion: 'mock-v1.0',
      inferenceTimeMs: 0,
      featureExtractionTimeMs: 0
    }
  }
  
  try {
    // フィーチャーフラグの確認
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('*')
      .in('key', ['enable_cpu_ml', 'enable_master_regression', 'enable_preset_recommendation', 'enable_align_confidence'])
    
    const flagMap = new Map(flags?.map(f => [f.key, f]) || [])
    
    if (!flagMap.get('enable_cpu_ml')?.is_enabled) {
      console.log('CPU ML is disabled')
      return result
    }
    
    // 特徴量抽出（モック）
    const featureStart = Date.now()
    const features = await extractAllFeatures(input.audioBuffers)
    result.metadata.featureExtractionTimeMs = Date.now() - featureStart
    
    // 各タスクの推論（モック）
    for (const task of tasks) {
      const taskFlag = getTaskFlag(task, flagMap)
      if (!taskFlag?.is_enabled) {
        continue
      }
      
      // A/Bテスト判定
      if (!shouldRunInference(input.userId, taskFlag.rollout_percentage)) {
        continue
      }
      
      // モック推論結果
      switch (task) {
        case 'master_reg':
          result.masterParams = {
            lowShelfDb: -1.5 + Math.random() * 3,
            highShelfDb: -0.5 + Math.random() * 2,
            compDb: 2 + Math.random() * 4,
            targetLufs: -14 + Math.random() * 2
          }
          break
        case 'preset_cls':
          const presets = ['default', 'vocal_focus', 'inst_focus', 'balanced', 'bright', 'warm']
          result.presetId = presets[Math.floor(Math.random() * presets.length)]
          break
        case 'align_conf':
          result.alignConfidence = 0.7 + Math.random() * 0.25
          break
      }
    }
    
    result.metadata.inferenceTimeMs = Date.now() - startTime
    
    // 推論結果を特徴量と共に保存（将来の学習用）
    if (input.jobId && Object.keys(result).length > 1) {
      await saveInferenceResults(input.jobId, features, result)
    }
    
    return result
    
  } catch (error) {
    console.error('Inference failed:', error)
    throw error
  }
}

/**
 * 全音声の特徴量抽出（モック）
 */
async function extractAllFeatures(
  audioBuffers: InferenceInput['audioBuffers']
): Promise<number[]> {
  
  const allFeatures: number[] = []
  
  // inst特徴量
  if (audioBuffers.inst) {
    const { vec } = await extractFeatures(audioBuffers.inst, 'inst')
    allFeatures.push(...vec)
  } else {
    allFeatures.push(...new Array(160).fill(0))
  }
  
  // vocal特徴量
  if (audioBuffers.vocal) {
    const { vec } = await extractFeatures(audioBuffers.vocal, 'vocal')
    allFeatures.push(...vec)
  } else {
    allFeatures.push(...new Array(160).fill(0))
  }
  
  // mix特徴量
  if (audioBuffers.inst && audioBuffers.vocal) {
    const mixBuffer = await createSimpleMix(audioBuffers.inst, audioBuffers.vocal)
    const { vec } = await extractFeatures(mixBuffer, 'mix')
    allFeatures.push(...vec)
  } else {
    allFeatures.push(...new Array(160).fill(0))
  }
  
  return allFeatures
}

/**
 * 簡易ミックス作成（モック）
 */
async function createSimpleMix(
  instBuffer: ArrayBuffer,
  vocalBuffer: ArrayBuffer
): Promise<ArrayBuffer> {
  // モック：2つのバッファの平均サイズを返す
  const avgSize = Math.floor((instBuffer.byteLength + vocalBuffer.byteLength) / 2)
  return new ArrayBuffer(avgSize)
}

/**
 * タスクフラグの取得
 */
function getTaskFlag(
  task: 'master_reg' | 'preset_cls' | 'align_conf',
  flagMap: Map<string, any>
): any {
  const flagKey = {
    'master_reg': 'enable_master_regression',
    'preset_cls': 'enable_preset_recommendation',
    'align_conf': 'enable_align_confidence'
  }[task]
  
  return flagMap.get(flagKey)
}

/**
 * A/Bテスト判定
 */
function shouldRunInference(userId: string, rolloutPercentage: number): boolean {
  if (rolloutPercentage >= 100) return true
  if (rolloutPercentage <= 0) return false
  
  // ユーザーIDのハッシュ値を使用して決定的に判定
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return (Math.abs(hash) % 100) < rolloutPercentage
}

/**
 * 推論結果の保存（モック）
 */
async function saveInferenceResults(
  jobId: string,
  features: number[],
  result: InferenceResult
): Promise<void> {
  
  // 自動ラベル生成（品質: auto）
  if (result.masterParams) {
    await supabase
      .from('labels')
      .upsert({
        job_id: jobId,
        task: 'master_reg',
        y_reg: [
          result.masterParams.lowShelfDb,
          result.masterParams.highShelfDb,
          result.masterParams.compDb,
          result.masterParams.targetLufs
        ],
        quality: 'auto'
      })
  }
  
  if (result.presetId) {
    await supabase
      .from('labels')
      .upsert({
        job_id: jobId,
        task: 'preset_cls',
        y_cls: result.presetId,
        quality: 'auto'
      })
  }
  
  if (result.alignConfidence !== undefined) {
    await supabase
      .from('labels')
      .upsert({
        job_id: jobId,
        task: 'align_conf',
        y_reg: [result.alignConfidence],
        quality: 'auto'
      })
  }
}

/**
 * マスタリングパラメータの推論（外部API用）
 */
export async function inferMasteringParams(
  instBuffer: ArrayBuffer,
  vocalBuffer: ArrayBuffer,
  userId: string
): Promise<{ lowShelfDb: number; highShelfDb: number; compDb: number; targetLufs: number } | null> {
  
  try {
    const result = await runInference(
      {
        jobId: '',
        userId,
        audioBuffers: { inst: instBuffer, vocal: vocalBuffer }
      },
      ['master_reg']
    )
    
    return result.masterParams || null
    
  } catch (error) {
    console.error('Failed to infer mastering params:', error)
    return null
  }
}

/**
 * プリセット推薦（外部API用）
 */
export async function recommendPreset(
  instBuffer: ArrayBuffer,
  vocalBuffer: ArrayBuffer,
  userId: string
): Promise<string> {
  
  try {
    const result = await runInference(
      {
        jobId: '',
        userId,
        audioBuffers: { inst: instBuffer, vocal: vocalBuffer }
      },
      ['preset_cls']
    )
    
    return result.presetId || 'default'
    
  } catch (error) {
    console.error('Failed to recommend preset:', error)
    return 'default'
  }
}

/**
 * アライメント信頼度の計算（外部API用）
 */
export async function calculateAlignmentConfidence(
  instBuffer: ArrayBuffer,
  vocalBuffer: ArrayBuffer,
  userId: string
): Promise<number> {
  
  try {
    const result = await runInference(
      {
        jobId: '',
        userId,
        audioBuffers: { inst: instBuffer, vocal: vocalBuffer }
      },
      ['align_conf']
    )
    
    return result.alignConfidence ?? 0.5
    
  } catch (error) {
    console.error('Failed to calculate alignment confidence:', error)
    return 0.5
  }
}