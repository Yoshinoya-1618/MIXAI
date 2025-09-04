// app/api/v1/jobs/[id]/analysis/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../../_lib/auth'
import { ApiError, errorResponse } from '../../../../_lib/errors'
import { detectOffset } from '../../../../../../worker/audio'

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

    // 実際の高度オフセット検出を実行
    const detectedOffset = await detectOffset(job.instrumental_path, job.vocal_path)
    
    const analysisResult = {
      // オフセット検出結果
      detected_offset_ms: detectedOffset,
      offset_confidence: calculateConfidence(detectedOffset),

      // 推奨プリセット（ファイル名ベース）
      recommended_preset: analyzeRecommendedPreset(job),
      
      // 音声品質指標（簡易版）
      vocal_quality: {
        estimated_quality: estimateVocalQuality(job),
        sync_accuracy: Math.abs(detectedOffset) <= 50 ? 'excellent' : 
                      Math.abs(detectedOffset) <= 100 ? 'good' : 'needs_adjustment'
      },

      // 最適化提案
      suggestions: generateOptimizationSuggestions(detectedOffset, job),
      
      // 解析メタデータ
      analysis_method: 'cross_correlation_onset',
      processed_at: new Date().toISOString()
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