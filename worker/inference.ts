// worker/inference.ts
// 推論モジュール（CPU最小構成）

import * as ort from 'onnxruntime-node'
import { supabase } from '../lib/supabase'
import { extractFeatures } from './features'

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

// モデルキャッシュ
const modelCache = new Map<string, ort.InferenceSession>()

/**
 * AI推論の実行
 */
export async function runInference(
  input: InferenceInput,
  tasks: Array<'master_reg' | 'preset_cls' | 'align_conf'>
): Promise<InferenceResult> {
  
  const startTime = Date.now()
  const result: InferenceResult = {
    metadata: {
      modelVersion: '',
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
    
    // 特徴量抽出
    const featureStart = Date.now()
    const features = await extractAllFeatures(input.audioBuffers)
    result.metadata.featureExtractionTimeMs = Date.now() - featureStart
    
    // 各タスクの推論
    for (const task of tasks) {
      const taskFlag = getTaskFlag(task, flagMap)
      if (!taskFlag?.is_enabled) {
        continue
      }
      
      // A/Bテスト判定
      if (!shouldRunInference(input.userId, taskFlag.rollout_percentage)) {
        continue
      }
      
      // モデル取得と推論
      const model = await getActiveModel(task)
      if (!model) {
        console.warn(`No active model for task: ${task}`)
        continue
      }
      
      const session = await loadModel(model.uri)
      const taskResult = await runTaskInference(session, features, task)
      
      // 結果の格納
      switch (task) {
        case 'master_reg':
          result.masterParams = taskResult as any
          break
        case 'preset_cls':
          result.presetId = taskResult as string
          break
        case 'align_conf':
          result.alignConfidence = taskResult as number
          break
      }
      
      result.metadata.modelVersion = model.version
      
      // オンラインメトリクスの記録
      await recordMetrics(model.id, Date.now() - startTime)
    }
    
    result.metadata.inferenceTimeMs = Date.now() - startTime
    
    // 推論結果を特徴量と共に保存（将来の学習用）
    if (input.jobId) {
      await saveInferenceResults(input.jobId, features, result)
    }
    
    return result
    
  } catch (error) {
    console.error('Inference failed:', error)
    throw error
  }
}

/**
 * 全音声の特徴量抽出
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
    // ゼロパディング
    allFeatures.push(...new Array(160).fill(0))
  }
  
  // vocal特徴量
  if (audioBuffers.vocal) {
    const { vec } = await extractFeatures(audioBuffers.vocal, 'vocal')
    allFeatures.push(...vec)
  } else {
    allFeatures.push(...new Array(160).fill(0))
  }
  
  // mix特徴量（instとvocalがある場合は合成）
  if (audioBuffers.inst && audioBuffers.vocal) {
    // 簡易的なミックス作成
    const mixBuffer = await createSimpleMix(audioBuffers.inst, audioBuffers.vocal)
    const { vec } = await extractFeatures(mixBuffer, 'mix')
    allFeatures.push(...vec)
  } else {
    allFeatures.push(...new Array(160).fill(0))
  }
  
  return allFeatures
}

/**
 * 簡易ミックス作成
 */
async function createSimpleMix(
  instBuffer: ArrayBuffer,
  vocalBuffer: ArrayBuffer
): Promise<ArrayBuffer> {
  // Web Audio APIを使用した簡易ミックス
  const AudioContext = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext
  const context = new AudioContext()
  
  // デコード
  const [instAudio, vocalAudio] = await Promise.all([
    context.decodeAudioData(instBuffer.slice(0)),
    context.decodeAudioData(vocalBuffer.slice(0))
  ])
  
  // 最短の長さに合わせる
  const length = Math.min(instAudio.length, vocalAudio.length)
  const sampleRate = instAudio.sampleRate
  const mixBuffer = context.createBuffer(2, length, sampleRate)
  
  // チャンネルごとにミックス
  for (let channel = 0; channel < 2; channel++) {
    const instData = new Float32Array(length)
    const vocalData = new Float32Array(length)
    const mixData = new Float32Array(length)
    
    if (instAudio.numberOfChannels > channel) {
      instAudio.copyFromChannel(instData, channel)
    }
    if (vocalAudio.numberOfChannels > channel) {
      vocalAudio.copyFromChannel(vocalData, channel)
    }
    
    // 単純な加算ミックス（0.5ずつの重み）
    for (let i = 0; i < length; i++) {
      mixData[i] = instData[i] * 0.5 + vocalData[i] * 0.5
    }
    
    mixBuffer.copyToChannel(mixData, channel)
  }
  
  // ArrayBufferに変換（簡易版）
  const mixArray = new Float32Array(length * 2)
  for (let i = 0; i < length; i++) {
    mixArray[i * 2] = mixBuffer.getChannelData(0)[i]
    mixArray[i * 2 + 1] = mixBuffer.getChannelData(1)[i]
  }
  
  return mixArray.buffer
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
    hash = hash & hash // Convert to 32bit integer
  }
  
  return (Math.abs(hash) % 100) < rolloutPercentage
}

/**
 * アクティブモデルの取得
 */
async function getActiveModel(
  task: 'master_reg' | 'preset_cls' | 'align_conf'
): Promise<any> {
  
  const { data: model } = await supabase
    .from('model_registry')
    .select('*')
    .eq('name', task)
    .eq('is_active', true)
    .single()
  
  return model
}

/**
 * モデルのロード
 */
async function loadModel(modelUri: string): Promise<ort.InferenceSession> {
  // キャッシュチェック
  if (modelCache.has(modelUri)) {
    return modelCache.get(modelUri)!
  }
  
  // Storageからモデルをダウンロード
  const { data, error } = await supabase.storage
    .from('models')
    .download(modelUri)
  
  if (error) {
    throw new Error(`Failed to download model: ${error.message}`)
  }
  
  // ArrayBufferに変換
  const arrayBuffer = await data.arrayBuffer()
  
  // ONNXランタイムでロード
  const session = await ort.InferenceSession.create(arrayBuffer, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
    enableCpuMemArena: true,
    enableMemPattern: true
  })
  
  // キャッシュに保存（最大5モデル）
  if (modelCache.size >= 5) {
    const firstKey = modelCache.keys().next().value
    modelCache.delete(firstKey)
  }
  modelCache.set(modelUri, session)
  
  return session
}

/**
 * タスク別推論実行
 */
async function runTaskInference(
  session: ort.InferenceSession,
  features: number[],
  task: 'master_reg' | 'preset_cls' | 'align_conf'
): Promise<any> {
  
  // 入力テンソルの作成
  const inputTensor = new ort.Tensor('float32', features, [1, features.length])
  
  // 推論実行
  const feeds = { input: inputTensor }
  const results = await session.run(feeds)
  
  // 出力の処理
  const output = results.output || results.probabilities || results.regression
  const outputData = output.data as Float32Array
  
  switch (task) {
    case 'master_reg':
      // 回帰出力（4次元）
      return {
        lowShelfDb: Math.max(-6, Math.min(6, outputData[0])),
        highShelfDb: Math.max(-6, Math.min(6, outputData[1])),
        compDb: Math.max(0, Math.min(10, outputData[2])),
        targetLufs: Math.max(-30, Math.min(-6, outputData[3]))
      }
      
    case 'preset_cls':
      // 分類出力（確率最大のクラス）
      const presets = [
        'default', 'vocal_focus', 'inst_focus', 'balanced',
        'bright', 'warm', 'punchy', 'spacious', 'intimate', 'powerful'
      ]
      const maxIndex = Array.from(outputData).indexOf(Math.max(...outputData))
      return presets[maxIndex] || 'default'
      
    case 'align_conf':
      // 信頼度スコア（0-1）
      return Math.max(0, Math.min(1, outputData[0]))
      
    default:
      throw new Error(`Unknown task: ${task}`)
  }
}

/**
 * オンラインメトリクスの記録
 */
async function recordMetrics(
  modelId: number,
  latencyMs: number
): Promise<void> {
  
  // 1時間ウィンドウのメトリクスを更新
  const { error } = await supabase
    .from('model_metrics')
    .insert({
      model_id: modelId,
      window: '1h',
      n: 1,
      latency_ms: latencyMs,
      err_rate: 0
    })
  
  if (error) {
    console.error('Failed to record metrics:', error)
  }
}

/**
 * 推論結果の保存
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