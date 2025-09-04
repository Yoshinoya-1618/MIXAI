// app/api/v1/mix/reference/analyze/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../../_lib/auth'
import { ApiError, errorResponse } from '../../../../_lib/errors'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /v1/mix/reference/analyze - 参照曲解析（Creatorのみ、0C）
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const { jobId, refUploadId } = await request.json()

    if (!jobId || !refUploadId) {
      throw new ApiError(400, 'jobId and refUploadId are required')
    }

    console.log(`🎯 Starting reference analysis for job ${jobId}`)

    // プラン確認（Creatorのみ）
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_code')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const planCode = subscription?.plan_code
    if (planCode !== 'creator') {
      throw new ApiError(403, 'Reference analysis requires Creator plan')
    }

    // ジョブの存在確認
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (!job) {
      throw new ApiError(404, 'Job not found or access denied')
    }

    // 既存の参照解析をチェック（冪等性）
    const { data: existingRef } = await supabase
      .from('mix_refs')
      .select('*')
      .eq('job_id', jobId)
      .eq('upload_id', refUploadId)
      .single()

    if (existingRef) {
      console.log(`✅ Reference analysis already exists for job ${jobId}`)
      return Response.json({
        success: true,
        cached: true,
        tonalCurve: existingRef.analysis.tonal,
        dynamics: existingRef.analysis.dynamics,
        stereo: existingRef.analysis.stereo,
        weights: existingRef.analysis.weights,
        suggestDiff: existingRef.analysis.suggest_diff,
        meta: {
          job_id: jobId,
          ref_upload_id: refUploadId,
          analysis_cached: true
        }
      })
    }

    // 参照曲解析実行
    const analysisResult = await performReferenceAnalysis({
      jobId,
      userId,
      job,
      refUploadId
    })

    // 差分提案計算
    const suggestDiff = calculateSuggestedAdjustments(job.user_params || job.ai_params, analysisResult)

    // 結果をデータベースに保存
    await supabase
      .from('mix_refs')
      .upsert({
        job_id: jobId,
        upload_id: refUploadId,
        analysis: {
          ...analysisResult,
          suggest_diff: suggestDiff,
          analyzed_at: new Date().toISOString()
        }
      })

    console.log(`✅ Reference analysis completed for job ${jobId}`)

    return Response.json({
      success: true,
      tonalCurve: analysisResult.tonal,
      dynamics: analysisResult.dynamics,
      stereo: analysisResult.stereo,
      weights: analysisResult.weights,
      suggestDiff,
      meta: {
        job_id: jobId,
        ref_upload_id: refUploadId,
        processing_time: analysisResult.processing_time
      }
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'reference_analysis_error', 
      message: '参照曲解析に失敗しました', 
      details: error 
    })
  }
}

/**
 * 参照曲解析の実装
 */
async function performReferenceAnalysis(options: {
  jobId: string
  userId: string
  job: any
  refUploadId: string
}) {
  const { execa } = await import('execa')
  const path = await import('path')
  const fs = await import('fs/promises')

  const { jobId, refUploadId } = options
  const startTime = Date.now()

  try {
    // 参照曲ファイルをダウンロード
    const { data: refData } = await supabase.storage
      .from('uta-uploads')
      .download(`references/${options.userId}/${refUploadId}`)

    if (!refData) {
      throw new Error('Reference file not found')
    }

    // 一時ファイル作成
    const tempDir = path.join(process.cwd(), 'temp', jobId)
    await fs.mkdir(tempDir, { recursive: true })
    
    const refTempPath = path.join(tempDir, 'reference.wav')
    await fs.writeFile(refTempPath, Buffer.from(await refData.arrayBuffer()))

    // Python解析スクリプト実行
    const pythonScript = path.join(process.cwd(), 'worker', 'reference-analysis.py')
    const result = await execa('python3', [
      pythonScript,
      '--input', refTempPath,
      '--format', 'json'
    ], {
      timeout: 90000 // 90秒タイムアウト
    })

    // 一時ファイル削除
    await fs.rm(tempDir, { recursive: true, force: true })

    const analysisData = JSON.parse(result.stdout)
    const processingTime = Date.now() - startTime

    return {
      tonal: analysisData.tonal,
      dynamics: analysisData.dynamics,
      stereo: analysisData.stereo,
      weights: {
        tonal: 0.7,
        dynamics: 0.5,
        stereo: 0.3
      },
      processing_time: processingTime
    }

  } catch (error) {
    // エラー時も一時ファイルを削除
    const tempDir = path.join(process.cwd(), 'temp', jobId)
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    throw error
  }
}

/**
 * 参照曲に基づく調整提案計算
 */
function calculateSuggestedAdjustments(currentParams: any, refAnalysis: any) {
  const suggestions = {
    air: 0,
    body: 0,
    punch: 0,
    width: 0,
    vocal: 0,
    clarity: 0,
    presence: 0
  }

  // トーナル特性に基づく提案
  if (refAnalysis.tonal) {
    // 高域特性
    if (refAnalysis.tonal.high_shelf > 0.5) {
      suggestions.air = Math.min(1.0, currentParams.air + 0.2)
    } else if (refAnalysis.tonal.high_shelf < -0.5) {
      suggestions.air = Math.max(0.0, currentParams.air - 0.2)
    }

    // 中域特性
    if (refAnalysis.tonal.mid_boost > 1.0) {
      suggestions.vocal = Math.min(1.0, currentParams.vocal + 0.15)
      suggestions.clarity = Math.min(1.0, (currentParams.clarity || 0) + 0.1)
    }

    // 低域特性
    if (refAnalysis.tonal.low_shelf > 0.3) {
      suggestions.body = Math.min(1.0, currentParams.body + 0.15)
    }
  }

  // ダイナミクス特性に基づく提案
  if (refAnalysis.dynamics) {
    // Crest Factor
    if (refAnalysis.dynamics.crest_factor > 15) {
      suggestions.punch = Math.max(0.0, currentParams.punch - 0.1)
    } else if (refAnalysis.dynamics.crest_factor < 10) {
      suggestions.punch = Math.min(1.0, currentParams.punch + 0.1)
    }
  }

  // ステレオ特性に基づく提案
  if (refAnalysis.stereo) {
    if (refAnalysis.stereo.width > 0.9) {
      suggestions.width = Math.min(1.0, currentParams.width + 0.1)
    } else if (refAnalysis.stereo.width < 0.7) {
      suggestions.width = Math.max(0.0, currentParams.width - 0.1)
    }
  }

  return suggestions
}

// GET /v1/mix/reference/analyze - 保存済み参照解析取得
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      throw new ApiError(400, 'jobId is required')
    }

    // 参照解析データ取得
    const { data: refData } = await supabase
      .from('mix_refs')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    return Response.json({
      success: true,
      references: refData || [],
      count: refData?.length || 0
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'get_reference_error', 
      message: '参照解析データの取得に失敗しました', 
      details: error 
    })
  }
}