// app/api/v1/mix/analyze/route.ts
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '../../../../../lib/supabase-server'
import { z } from 'zod'

const analyzeSchema = z.object({
  jobId: z.string().uuid(),
  plan: z.enum(['lite', 'standard', 'creator']),
  refTrackId: z.string().uuid().optional()
})

// POST /v1/mix/analyze - AI MIX解析と適用（冪等）
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    
    // ユーザー認証チェック
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return Response.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, plan, refTrackId } = analyzeSchema.parse(body)

    console.log(`🧪 Starting AI MIX analysis for job ${jobId}, plan ${plan}`)

    // ジョブの存在確認と権限チェック
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', session.user.id)
      .single()

    if (jobError || !job) {
      return Response.json({ error: 'ジョブが見つかりません' }, { status: 404 })
    }

    if (!job.vocal_path || !job.instrumental_path) {
      return Response.json({ error: 'オーディオファイルがアップロードされていません' }, { status: 400 })
    }

    // 冪等性チェック：ai_ok_artifactが既に存在する場合はスキップ
    if (job.ai_ok_artifact_id) {
      const { data: aiOkArtifact } = await supabase
        .from('artifacts')
        .select('*')
        .eq('id', job.ai_ok_artifact_id)
        .single()

      if (aiOkArtifact && new Date(aiOkArtifact.expires_at) > new Date()) {
        console.log(`✅ AI analysis already completed for job ${jobId}`)
        return Response.json({
          success: true,
          cached: true,
          aiParams: job.ai_params,
          snapshots: {
            AI_BASE: job.ai_params
          },
          meta: {
            job_id: jobId,
            plan,
            analysis_cached: true,
            artifact_id: aiOkArtifact.id
          }
        })
      }
    }

    // レート制限チェック（同時処理2件まで）
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('status', 'processing')

    if (activeJobs && activeJobs.length >= 2) {
      return Response.json({ error: 'Too many concurrent jobs. Please wait.' }, { status: 429 })
    }

    // ジョブを処理中に設定
    await supabase
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    try {
      // 高度音声解析を実行
      // モック解析結果
      const analysisResult = {
        air: 0.6,
        body: 0.5,
        punch: 0.7,
        width: 0.4,
        vocal: 0.8,
        clarity: plan !== 'lite' ? 0.6 : undefined,
        presence: plan === 'creator' ? 0.5 : undefined,
        analysis_method: 'advanced',
        processingTime: 1200
      }

      // AI MIXパラメータを計算
      // AI MIXパラメータを計算（モック実装）
      const aiParams = {
        airDb: analysisResult.air * 6 - 3,
        lowDb: analysisResult.body * 6 - 3,
        punchCompDb: analysisResult.punch * 6,
        spaceReverbSec: analysisResult.width * 2.8 + 0.2,
        presenceDb: analysisResult.vocal * 6 - 3,
        clarityDb: analysisResult.clarity ? analysisResult.clarity * 6 - 3 : 0,
        exciterDb: analysisResult.presence ? analysisResult.presence * 6 - 3 : 0,
        deEssDb: 2.0,
        satDb: 1.0,
        stereoRatio: 1.0,
        gateThreshDb: -45,
        harmVol: 0.6
      }

      // Creator自動付与機能：HQマスター・強力ノイズ抑制
      let advancedFeatures = {}
      if (plan === 'creator') {
        const hqMasterEnabled = process.env.CREATOR_HQ_MASTER_DEFAULT === '1'
        const denoiseStrongEnabled = process.env.CREATOR_DENOISE_STRONG_DEFAULT === '1'
        
        advancedFeatures = {
          hqMasterIncluded: hqMasterEnabled,
          denoiseStrongIncluded: denoiseStrongEnabled,
          hqMasterParams: hqMasterEnabled ? {
            oversampling: parseInt(process.env.MASTER_OS_MAX || '16'),
            truePeak: true,
            ceilingDbTP: parseFloat(process.env.MASTER_TP_CEILING_DB || '-1.0'),
            targetLufs: -14,
            limiterPass: 2
          } : null,
          denoiseStrongParams: denoiseStrongEnabled ? {
            mode: 'auto',
            maxReductionDb: parseFloat(process.env.DENOISE_MAX_REDUCTION_DB || '14'),
            transientGuard: true,
            musicalNoiseGuard: true
          } : null
        }
      }

      // Creatorプラン：参照曲解析
      let refAnalysis = null
      if (plan === 'creator' && refTrackId) {
        try {
          // モック参照解析結果
          refAnalysis = {
            genre: 'j-pop',
            tempo: 120,
            key: 'C major',
            loudness_lufs: -14.0,
            dynamic_range: 8.5
          }
        } catch (refError) {
          console.warn('Reference analysis failed:', refError)
        }
      }

      // 品質メトリクス計算
      const metrics = calculateQualityMetrics(analysisResult, aiParams)

      // データベースに保存
      await supabase
        .from('jobs')
        .update({
          status: 'done',
          ai_params: aiParams,
          user_params: aiParams, // 初期値はAI_BASEと同じ
          metrics,
          analysis_completed_at: new Date().toISOString()
        })
        .eq('id', jobId)

      // 参照曲データがある場合は保存
      if (refAnalysis) {
        await supabase
          .from('mix_refs')
          .upsert({
            job_id: jobId,
            upload_id: refTrackId,
            analysis: refAnalysis
          })
      }

      const warnings = generateWarnings(analysisResult, metrics, plan)

      console.log(`✅ AI MIX analysis completed for job ${jobId}`)

      return Response.json({
        success: true,
        aiParams,
        snapshots: {
          AI_BASE: aiParams
        },
        meta: {
          job_id: jobId,
          plan,
          analysis_method: analysisResult.analysis_method || 'advanced',
          processing_time: analysisResult.processingTime,
          reference_analyzed: !!refAnalysis,
          ...advancedFeatures
        },
        warnings: warnings.length > 0 ? warnings : undefined
      })

    } catch (error) {
      // エラー時はジョブステータスを戻す
      await supabase
        .from('jobs')
        .update({ status: job.status })
        .eq('id', jobId)

      throw error
    }

  } catch (error) {
    return Response.json({ 
      error: 'AI MIX解析に失敗しました',
      details: error instanceof Error ? error.message : error
    }, { status: 500 })
  }
}

/**
 * 解析結果からAI MIXパラメータを計算
 */
function calculateAIMixParams(analysisResult: any, plan: string, job: any) {
  const { offset, tempo, pitch } = analysisResult

  // プラン別基本パラメータ
  const baseParams = {
    lite: {
      air: 0.3,
      body: 0.2,
      punch: 0.4,
      width: 0.0,
      vocal: 0.5
    },
    standard: {
      air: 0.4,
      body: 0.3,
      punch: 0.5,
      width: 0.1,
      vocal: 0.6,
      clarity: 0.3
    },
    creator: {
      air: 0.5,
      body: 0.4,
      punch: 0.6,
      width: 0.2,
      vocal: 0.7,
      clarity: 0.4,
      presence: 0.2
    }
  }

  let params = { ...baseParams[plan as keyof typeof baseParams] }

  // 解析結果に基づく自動調整
  if (analysisResult.vocal_quality?.estimated_quality === 'excellent') {
    params.air += 0.2
    if ('clarity' in params) {
      params.clarity += 0.1
    }
  }

  if (pitch.correction_candidates.length > 3) {
    params.vocal += 0.1
    if ('clarity' in params) {
      params.clarity += 0.2
    }
  }

  if (tempo.tempo_variability > 0.2) {
    params.punch -= 0.1
    params.body += 0.1
  }

  // パラメータを0-1の範囲にクランプ
  Object.keys(params).forEach(key => {
    params[key as keyof typeof params] = Math.max(0, Math.min(1, params[key as keyof typeof params]))
  })

  return {
    ...params,
    fade_in: 0,
    fade_out: 0,
    output_gain: 0,
    genre_target: determineGenreTarget(job, analysisResult),
    offset_ms: offset.offset_ms,
    processing_settings: {
      plan,
      dtw_enabled: plan !== 'lite' && tempo.dtw_applicable,
      pitch_correction: pitch.correction_candidates.slice(0, plan === 'lite' ? 2 : plan === 'standard' ? 5 : 10),
      oversampling: plan === 'lite' ? 4 : plan === 'standard' ? 8 : 16
    }
  }
}

/**
 * ジャンルターゲットを自動判定
 */
function determineGenreTarget(job: any, analysisResult: any): string {
  const pathText = ((job.vocal_path || '') + ' ' + (job.instrumental_path || '')).toLowerCase()
  
  if (pathText.includes('ballad')) return 'ballad'
  if (pathText.includes('rock')) return 'rock'
  if (pathText.includes('edm') || pathText.includes('dance')) return 'edm'
  if (pathText.includes('pop')) return 'j-pop'
  
  // 解析結果から推定
  if (analysisResult.tempo?.tempo_variability < 0.1) {
    return 'edm'
  } else if (analysisResult.tempo?.tempo_variability > 0.3) {
    return 'ballad'
  }
  
  return 'j-pop' // デフォルト
}

/**
 * 品質メトリクス計算
 */
function calculateQualityMetrics(analysisResult: any, aiParams: any) {
  return {
    offset_accuracy: Math.abs(analysisResult.offset.offset_ms) <= 10 ? 'excellent' : 
                    Math.abs(analysisResult.offset.offset_ms) <= 50 ? 'good' : 'fair',
    tempo_stability: analysisResult.tempo.tempo_variability < 0.1 ? 'stable' : 
                    analysisResult.tempo.tempo_variability < 0.2 ? 'moderate' : 'variable',
    pitch_quality: analysisResult.pitch.correction_candidates.length === 0 ? 'excellent' :
                  analysisResult.pitch.correction_candidates.length <= 3 ? 'good' : 'needs_correction',
    estimated_lufs: -14.0, // 初期推定値
    estimated_tp: -1.0,
    processing_complexity: Object.keys(aiParams).length > 5 ? 'high' : 'standard'
  }
}

/**
 * 警告メッセージ生成
 */
function generateWarnings(analysisResult: any, metrics: any, plan: string): string[] {
  const warnings: string[] = []

  if (Math.abs(analysisResult.offset.offset_ms) > 100) {
    warnings.push('オフセットが大きめです。手動調整をお勧めします。')
  }

  if (analysisResult.pitch.correction_candidates.length > 5 && plan === 'lite') {
    warnings.push('多くのピッチ補正候補があります。上位プランでより高精度な補正が利用できます。')
  }

  if (analysisResult.tempo.tempo_variability > 0.3 && plan !== 'creator') {
    warnings.push('テンポの変動が大きいです。Creatorプランで高精度な可変テンポ補正が利用できます。')
  }

  return warnings
}

/**
 * 参照曲解析（Creatorのみ）
 */
async function analyzeReferenceTrack(jobId: string, refTrackId: string, userId: string) {
  // 参照曲の解析実装（簡易版）
  // 実際の実装では、アップロードされた参照曲を解析して
  // トーナル/ダイナミクス/ステレオの特徴を抽出
  
  return {
    tonal: {
      low_shelf: -0.5,
      mid_boost: 1.2,
      high_shelf: 0.8
    },
    dynamics: {
      crest_factor: 12.5,
      plr: 18.2
    },
    stereo: {
      width: 0.85,
      correlation: 0.92
    },
    weights: {
      tonal: 0.7,
      dynamics: 0.5,
      stereo: 0.3
    }
  }
}