// lib/ab-testing.ts
// A/Bテスト機能の実装

import { supabase } from './supabase'

export interface ABTestVariant {
  id: string
  name: string
  description: string
  percentage: number
  isControl: boolean
  config: Record<string, any>
}

export interface ABTest {
  id: string
  name: string
  feature: string
  status: 'draft' | 'running' | 'paused' | 'completed'
  variants: ABTestVariant[]
  startDate: Date
  endDate?: Date
  targetUsers?: 'all' | 'new' | 'existing' | string[]
  metrics: string[]
}

export interface ABTestAssignment {
  userId: string
  testId: string
  variantId: string
  assignedAt: Date
}

export interface ABTestMetric {
  testId: string
  variantId: string
  metricName: string
  value: number
  count: number
  timestamp: Date
}

/**
 * ユーザーのA/Bテスト割り当てを取得
 */
export async function getUserVariant(
  userId: string,
  testFeature: string
): Promise<ABTestVariant | null> {
  try {
    // アクティブなA/Bテストを取得
    const { data: flags } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('key', testFeature)
      .eq('is_enabled', true)
      .single()

    if (!flags || !flags.ab_test_config) {
      return null
    }

    const abTest = flags.ab_test_config as ABTest

    // 既存の割り当てをチェック
    const { data: assignment } = await supabase
      .from('ab_test_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('test_id', abTest.id)
      .single()

    if (assignment) {
      // 既存の割り当てを返す
      const variant = abTest.variants.find(v => v.id === assignment.variant_id)
      return variant || null
    }

    // 新規割り当て
    const variant = assignUserToVariant(userId, abTest)
    
    if (variant) {
      // 割り当てを保存
      await supabase
        .from('ab_test_assignments')
        .insert({
          user_id: userId,
          test_id: abTest.id,
          variant_id: variant.id,
          assigned_at: new Date().toISOString()
        })
    }

    return variant

  } catch (error) {
    console.error('Failed to get user variant:', error)
    return null
  }
}

/**
 * ユーザーをバリアントに割り当て
 */
function assignUserToVariant(
  userId: string,
  test: ABTest
): ABTestVariant | null {
  
  // ユーザーIDのハッシュ値を計算
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  // 0-100の範囲に正規化
  const bucket = Math.abs(hash) % 100
  
  // バリアントの累積確率で判定
  let cumulative = 0
  for (const variant of test.variants) {
    cumulative += variant.percentage
    if (bucket < cumulative) {
      return variant
    }
  }
  
  // フォールバック（コントロール群）
  return test.variants.find(v => v.isControl) || null
}

/**
 * イベントをトラッキング
 */
export async function trackABTestEvent(
  userId: string,
  testFeature: string,
  eventName: string,
  value: number = 1
): Promise<void> {
  try {
    const variant = await getUserVariant(userId, testFeature)
    if (!variant) return

    // メトリクスを記録
    await supabase
      .from('ab_test_metrics')
      .insert({
        test_id: testFeature,
        variant_id: variant.id,
        user_id: userId,
        metric_name: eventName,
        value,
        created_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Failed to track AB test event:', error)
  }
}

/**
 * A/Bテストの結果を集計
 */
export async function getABTestResults(
  testId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  variants: Array<{
    id: string
    name: string
    metrics: Record<string, {
      count: number
      sum: number
      avg: number
      conversion: number
    }>
    users: number
  }>
  winner?: string
  confidence?: number
}> {
  
  try {
    // テスト設定を取得
    const { data: test } = await supabase
      .from('feature_flags')
      .select('ab_test_config')
      .eq('key', testId)
      .single()

    if (!test?.ab_test_config) {
      throw new Error('Test not found')
    }

    const abTest = test.ab_test_config as ABTest

    // メトリクスを集計
    let query = supabase
      .from('ab_test_metrics')
      .select('*')
      .eq('test_id', testId)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data: metrics } = await query

    // バリアントごとに集計
    const results = abTest.variants.map(variant => {
      const variantMetrics = metrics?.filter(m => m.variant_id === variant.id) || []
      
      const metricsMap: Record<string, any> = {}
      const uniqueUsers = new Set<string>()

      for (const metric of variantMetrics) {
        if (!metricsMap[metric.metric_name]) {
          metricsMap[metric.metric_name] = {
            count: 0,
            sum: 0,
            avg: 0,
            conversion: 0
          }
        }

        metricsMap[metric.metric_name].count++
        metricsMap[metric.metric_name].sum += metric.value
        uniqueUsers.add(metric.user_id)
      }

      // 平均とコンバージョン率を計算
      for (const [name, data] of Object.entries(metricsMap)) {
        data.avg = data.count > 0 ? data.sum / data.count : 0
        data.conversion = uniqueUsers.size > 0 ? (data.count / uniqueUsers.size) * 100 : 0
      }

      return {
        id: variant.id,
        name: variant.name,
        metrics: metricsMap,
        users: uniqueUsers.size
      }
    })

    // 統計的有意性の計算（簡易版）
    const winner = determineWinner(results)

    return {
      variants: results,
      winner: winner?.id,
      confidence: winner?.confidence
    }

  } catch (error) {
    console.error('Failed to get AB test results:', error)
    throw error
  }
}

/**
 * 勝者バリアントを決定（簡易版）
 */
function determineWinner(
  results: Array<{
    id: string
    metrics: Record<string, any>
    users: number
  }>
): { id: string; confidence: number } | null {
  
  if (results.length < 2) return null

  // 主要メトリクス（例：conversion）で比較
  const primaryMetric = 'conversion'
  
  // コントロール群を見つける
  const control = results[0]
  let bestVariant = control
  let maxImprovement = 0

  for (let i = 1; i < results.length; i++) {
    const variant = results[i]
    const controlValue = control.metrics[primaryMetric]?.conversion || 0
    const variantValue = variant.metrics[primaryMetric]?.conversion || 0
    
    if (variantValue > controlValue) {
      const improvement = ((variantValue - controlValue) / controlValue) * 100
      if (improvement > maxImprovement) {
        maxImprovement = improvement
        bestVariant = variant
      }
    }
  }

  // 簡易的な信頼度計算（実際にはカイ二乗検定などを使用）
  const sampleSize = Math.min(control.users, bestVariant.users)
  const confidence = Math.min(95, 50 + Math.sqrt(sampleSize) * 2)

  return {
    id: bestVariant.id,
    confidence
  }
}

/**
 * 機能フラグとA/Bテストの統合
 */
export async function getFeatureValue<T = any>(
  userId: string,
  featureKey: string,
  defaultValue: T
): Promise<T> {
  try {
    // フィーチャーフラグを取得
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('key', featureKey)
      .single()

    if (!flag || !flag.is_enabled) {
      return defaultValue
    }

    // A/Bテストが設定されている場合
    if (flag.ab_test_config) {
      const variant = await getUserVariant(userId, featureKey)
      if (variant?.config) {
        return variant.config.value ?? defaultValue
      }
    }

    // 通常のロールアウト
    const rollout = flag.rollout_percentage || 0
    const userBucket = getUserBucket(userId)
    
    if (userBucket < rollout) {
      return flag.config?.value ?? defaultValue
    }

    return defaultValue

  } catch (error) {
    console.error('Failed to get feature value:', error)
    return defaultValue
  }
}

/**
 * ユーザーバケットの計算（0-100）
 */
function getUserBucket(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash) % 100
}

/**
 * MLモデルのA/Bテスト
 */
export async function getMLModelVariant(
  userId: string,
  modelName: string
): Promise<{ modelId: string; version: string } | null> {
  try {
    // アクティブなモデルを取得
    const { data: models } = await supabase
      .from('model_registry')
      .select('*')
      .eq('name', modelName)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (!models || models.length === 0) {
      return null
    }

    // A/Bテスト設定がある場合
    if (models.length > 1) {
      // ロールアウト割合に基づいて選択
      const userBucket = getUserBucket(userId)
      let cumulative = 0

      for (const model of models) {
        cumulative += model.rollout_percentage
        if (userBucket < cumulative) {
          return {
            modelId: model.id,
            version: model.version
          }
        }
      }
    }

    // デフォルトは最新モデル
    return {
      modelId: models[0].id,
      version: models[0].version
    }

  } catch (error) {
    console.error('Failed to get ML model variant:', error)
    return null
  }
}