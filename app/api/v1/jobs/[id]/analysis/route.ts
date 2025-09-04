// app/api/v1/jobs/[id]/analysis/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../../_lib/auth'
import { ApiError, errorResponse } from '../../../../_lib/errors'
import { detectOffset } from '../../../../../../worker/audio'
import { performAdvancedAnalysis } from '../../../../../../worker/enhanced-audio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /v1/jobs/:id/analysis - 解析実行と結果返却
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticateUser(request)
    const jobId = params.id

    // ジョブの存在確認と権限チェック
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (!job) {
      throw new ApiError(404, 'Job not found or access denied')
    }

    if (!job.vocal_path || !job.instrumental_path) {
      throw new ApiError(400, 'Audio files not uploaded')
    }

    console.log(`🔍 Starting advanced analysis for job ${jobId}`)

    // ユーザープランを取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_code, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    
    const planCode = subscription?.plan_code || 'lite'

    // 高度音声解析を実行
    let analysisResult
    try {
      const advancedResult = await performAdvancedAnalysis(
        job.vocal_path,
        job.instrumental_path, 
        planCode
      )
      
      analysisResult = {
        // 高精度オフセット検出結果
        detected_offset_ms: advancedResult.offset.offset_ms,
        offset_confidence: advancedResult.offset.confidence,

        // DTWテンポ解析結果
        tempo_analysis: advancedResult.tempo,
        
        // ピッチ解析結果
        pitch_analysis: advancedResult.pitch,

        // 推奨プリセット（解析ベース + ファイル名ベース）
        recommended_preset: determineOptimalPreset(advancedResult, job, planCode),
        
        // 詳細音声品質指標
        vocal_quality: {
          estimated_quality: estimateAdvancedQuality(advancedResult),
          sync_accuracy: Math.abs(advancedResult.offset.offset_ms) <= 10 ? 'excellent' : 
                        Math.abs(advancedResult.offset.offset_ms) <= 50 ? 'good' : 'needs_adjustment',
          pitch_accuracy: advancedResult.pitch.correction_candidates.length === 0 ? 'excellent' :
                         advancedResult.pitch.correction_candidates.length <= 3 ? 'good' : 'needs_correction',
          tempo_stability: advancedResult.tempo.tempo_variability < 0.1 ? 'stable' : 
                          advancedResult.tempo.tempo_variability < 0.2 ? 'moderate' : 'variable'
        },

        // 智能化最適化提案
        suggestions: generateAdvancedSuggestions(advancedResult, job, planCode),
        
        // プランに基づく利用可能機能
        available_features: getAvailableFeatures(planCode),
        
        // 解析メタデータ
        analysis_method: 'librosa_dtw_crepe',
        plan_code: planCode,
        processed_at: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('Advanced analysis failed, falling back to basic:', error)
      
      // フォールバック：基本オフセット検出
      const detectedOffset = await detectOffset(job.instrumental_path, job.vocal_path)
      
      analysisResult = {
        detected_offset_ms: detectedOffset,
        offset_confidence: calculateConfidence(detectedOffset),
        recommended_preset: analyzeRecommendedPreset(job),
        vocal_quality: {
          estimated_quality: estimateVocalQuality(job),
          sync_accuracy: Math.abs(detectedOffset) <= 50 ? 'excellent' : 
                        Math.abs(detectedOffset) <= 100 ? 'good' : 'needs_adjustment'
        },
        suggestions: generateOptimizationSuggestions(detectedOffset, job),
        analysis_method: 'basic_fallback',
        processed_at: new Date().toISOString()
      }
    }

    // 解析結果をジョブに保存
    await supabase
      .from('jobs')
      .update({
        offset_ms: analysisResult.detected_offset_ms,
        preset_key: analysisResult.recommended_preset,
        detected_offset_ms: analysisResult.detected_offset_ms,
        analysis_completed_at: analysisResult.processed_at
      })
      .eq('id', jobId)

    return Response.json({ 
      success: true, 
      analysis: analysisResult,
      meta: { job_id: jobId, method: 'advanced_correlation_onset' }
    })

  } catch (error) {
    return errorResponse(500, { code: 'analysis_error', message: '音声解析に失敗しました', details: error })
  }
}

/**
 * 信頼度スコアを計算
 */
function calculateConfidence(offsetMs: number): number {
  const absOffset = Math.abs(offsetMs)
  
  if (absOffset <= 10) return 0.95      // ±10ms以内: 高信頼度
  if (absOffset <= 50) return 0.85      // ±50ms以内: 中程度信頼度  
  if (absOffset <= 100) return 0.70     // ±100ms以内: やや信頼度
  if (absOffset <= 200) return 0.50     // ±200ms以内: 低信頼度
  return 0.30                           // それ以上: 非常に低信頼度
}

/**
 * 推奨プリセットを分析（ファイル名ベース）
 */
function analyzeRecommendedPreset(job: any): string {
  const vocalPath = job.vocal_path || ''
  const instPath = job.instrumental_path || ''
  
  // ファイル名に基づく簡易判定
  const pathText = (vocalPath + ' ' + instPath).toLowerCase()
  
  if (pathText.includes('ballad')) return 'warm_ballad'
  if (pathText.includes('pop')) return 'wide_pop'
  if (pathText.includes('rap') || pathText.includes('hip')) return 'rap_tight'
  if (pathText.includes('idol') || pathText.includes('bright')) return 'idol_bright'
  if (pathText.includes('studio')) return 'studio_shine'
  if (pathText.includes('live')) return 'live_stage'
  
  return 'clean_light' // デフォルト
}

/**
 * 音声品質推定（簡易版）
 */
function estimateVocalQuality(job: any): string {
  // ファイルサイズやパスから簡易推定
  const hasHarmony = !!job.harmony_path
  const isProcessed = job.status !== 'pending'
  
  if (hasHarmony && isProcessed) return 'excellent'
  if (hasHarmony || isProcessed) return 'good'
  return 'standard'
}

/**
 * 最適化提案を生成
 */
function generateOptimizationSuggestions(offsetMs: number, job: any): string[] {
  const suggestions: string[] = []
  const absOffset = Math.abs(offsetMs)
  
  if (absOffset <= 10) {
    suggestions.push('🎯 優秀な同期精度です。そのまま処理を進められます。')
  } else if (absOffset <= 50) {
    suggestions.push('✅ 良好な同期精度です。微調整で更に向上できます。')
  } else if (absOffset <= 100) {
    suggestions.push('⚠️ 同期精度はやや低めです。手動調整をおすすめします。')
  } else {
    suggestions.push('❗ オフセットが大きめです。手動調整が必要です。')
  }
  
  if (!job.harmony_path) {
    suggestions.push('🎵 ハーモニーファイルを追加すると、さらに豊かな音質になります。')
  }
  
  const currentPreset = job.preset_key || 'clean_light'
  if (currentPreset === 'clean_light') {
    suggestions.push('🎚️ 他のプリセットも試して、最適な音質を見つけてください。')
  }
  
  return suggestions
}

/**
 * 高度解析結果に基づく最適プリセット決定
 */
function determineOptimalPreset(analysisResult: any, job: any, planCode: string): string {
  const { tempo, pitch } = analysisResult
  const pathText = ((job.vocal_path || '') + ' ' + (job.instrumental_path || '')).toLowerCase()
  
  // テンポ安定性に基づく判定
  if (tempo.tempo_variability > 0.2) {
    // 高い変動性：ライブ系やバラード系
    if (pathText.includes('ballad')) return 'warm_ballad'
    if (planCode === 'creator') return 'live_stage'
    return 'soft_room'
  }
  
  // ピッチ精度に基づく判定
  if (pitch.correction_candidates.length <= 1) {
    // 高精度：クリーンな仕上がり
    if (planCode === 'creator') return 'studio_shine'
    if (planCode === 'standard') return 'wide_pop'
    return 'clean_light'
  }
  
  // ファイル名ベース補正
  if (pathText.includes('pop')) return 'wide_pop'
  if (pathText.includes('rap')) return 'rap_tight'
  if (pathText.includes('idol')) return 'idol_bright'
  
  // プラン別デフォルト
  const defaults = {
    'lite': 'clean_light',
    'standard': 'wide_pop',
    'creator': 'studio_shine'
  }
  return defaults[planCode as keyof typeof defaults] || 'clean_light'
}

/**
 * 高度解析結果に基づく音質評価
 */
function estimateAdvancedQuality(analysisResult: any): string {
  const { offset, tempo, pitch } = analysisResult
  
  let score = 0
  
  // オフセット精度 (30点満点)
  if (Math.abs(offset.offset_ms) <= 10) score += 30
  else if (Math.abs(offset.offset_ms) <= 50) score += 20
  else if (Math.abs(offset.offset_ms) <= 100) score += 10
  
  // テンポ安定性 (35点満点)
  if (tempo.tempo_variability < 0.1) score += 35
  else if (tempo.tempo_variability < 0.2) score += 25
  else if (tempo.tempo_variability < 0.3) score += 15
  
  // ピッチ精度 (35点満点)
  if (pitch.correction_candidates.length === 0) score += 35
  else if (pitch.correction_candidates.length <= 2) score += 25
  else if (pitch.correction_candidates.length <= 5) score += 15
  
  // 総合評価
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'needs_improvement'
}

/**
 * 高度解析結果に基づく詳細提案
 */
function generateAdvancedSuggestions(analysisResult: any, job: any, planCode: string): string[] {
  const suggestions: string[] = []
  const { offset, tempo, pitch } = analysisResult
  
  // オフセット提案
  if (Math.abs(offset.offset_ms) <= 10) {
    suggestions.push('🎯 完璧な同期精度です。高品質な仕上がりが期待できます。')
  } else if (Math.abs(offset.offset_ms) <= 50) {
    suggestions.push('✅ 良好な同期です。わずかな調整で更に向上します。')
  } else {
    suggestions.push(`⚠️ オフセットを${Math.round(offset.offset_ms)}ms調整することをお勧めします。`)
  }
  
  // テンポ提案
  if (tempo.dtw_applicable && planCode !== 'lite') {
    if (tempo.improvement_estimate > 0.5) {
      suggestions.push('🎵 可変テンポ補正が大幅な改善をもたらします。DTW処理を推奨します。')
    } else if (tempo.improvement_estimate > 0.3) {
      suggestions.push('🎶 可変テンポ補正で音質向上が期待できます。')
    }
  } else if (tempo.tempo_variability > 0.3) {
    suggestions.push('🎼 テンポの変動が大きいです。手動調整またはプラン升級を検討してください。')
  }
  
  // ピッチ提案
  if (pitch.correction_candidates.length > 0) {
    if (planCode === 'lite') {
      suggestions.push(`🎤 ${pitch.correction_candidates.length}箇所のピッチ調整候補があります。プランアップグレードで自動修正が利用できます。`)
    } else if (planCode === 'standard') {
      suggestions.push(`🎤 ${pitch.correction_candidates.length}箇所のワンクリック修正が利用できます。`)
    } else {
      suggestions.push(`🎤 ${pitch.correction_candidates.length}箇所を自動で高精度修正します。`)
    }
    
    // 主要な修正候補を表示
    const majorCorrections = pitch.correction_candidates
      .filter((c: any) => Math.abs(c.current_cent_error) > 40)
      .slice(0, 3)
    
    majorCorrections.forEach((c: any, i: number) => {
      const timeStr = `${Math.floor(c.start_time)}:${Math.floor((c.start_time % 1) * 100).toString().padStart(2, '0')}`
      suggestions.push(`   • ${timeStr}秒付近: ${c.current_cent_error > 0 ? '高め' : '低め'}に${Math.abs(c.current_cent_error).toFixed(0)}cent`)
    })
  }
  
  // プラン別追加提案
  if (planCode === 'lite' && (tempo.dtw_applicable || pitch.correction_candidates.length > 2)) {
    suggestions.push('💎 Standardプランで高精度な自動補正機能をご利用いただけます。')
  } else if (planCode === 'standard' && pitch.correction_candidates.some((c: any) => Math.abs(c.current_cent_error) > 50)) {
    suggestions.push('💎 Creatorプランで最高品質のWORLD再合成によるピッチ補正が利用できます。')
  }
  
  return suggestions
}

/**
 * プラン別利用可能機能
 */
function getAvailableFeatures(planCode: string) {
  const features = {
    lite: {
      presets: 3,
      micro_adjust: false,
      dtw_tempo: false,
      auto_pitch: false,
      rescue_mode: false,
      world_synthesis: false
    },
    standard: {
      presets: 7,
      micro_adjust: true,
      dtw_tempo: true,
      auto_pitch: 'one_click',
      rescue_mode: 'manual',
      world_synthesis: false
    },
    creator: {
      presets: 12,
      micro_adjust: true,
      dtw_tempo: true,
      auto_pitch: 'automatic',
      rescue_mode: 'automatic',
      world_synthesis: true
    }
  }
  
  return features[planCode as keyof typeof features] || features.lite
}