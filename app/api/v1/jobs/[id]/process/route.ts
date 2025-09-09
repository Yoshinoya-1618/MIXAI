// app/api/v1/jobs/[id]/process/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../../_lib/auth'
import { ApiError, errorResponse } from '../../../../_lib/errors'
import { validateJson } from '../../../../_lib/json'
import { z } from 'zod'
import { getAccuracyParams, getProcessingTimeMultiplier } from '../../../../../../worker/processing-accuracy'
import { getPresetParams } from '../../../../../../worker/presets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ProcessJobSchema = z.object({
  harmony: z.enum(['upper', 'lower', 'fifth']).optional(),
  theme: z.string().optional()
})

// POST /v1/jobs/:id/process - MIX処理開始
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const body = await validateJson(request, ProcessJobSchema)
    const jobId = params.id

    // ジョブの存在確認と権限チェック
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (jobError || !job) {
      throw new ApiError(404, 'Job not found or access denied')
    }

    // ステータスチェック
    if (job.status !== 'uploaded') {
      throw new ApiError(400, 'Job is not ready for processing')
    }

    // ユーザーのプラン確認
    const { data: subscription } = await supabase
      .rpc('get_active_subscription', { user_uuid: userId })
      .maybeSingle()

    const planCode = (subscription as any)?.plan_code || 'prepaid'

    // 処理精度パラメータを取得
    const accuracyParams = getAccuracyParams(planCode)
    const processingTimeMultiplier = getProcessingTimeMultiplier(
      planCode === 'freetrial' || planCode === 'creator' ? 'ultra-high' :
      planCode === 'standard' || planCode === 'prepaid' ? 'high' : 'standard'
    )

    // テーマ（プリセット）パラメータを取得
    let themeParams = null
    if (body.theme) {
      try {
        themeParams = getPresetParams(body.theme as any)
      } catch (e) {
        // デフォルトテーマを使用
        themeParams = getPresetParams('clean_light')
      }
    }

    // ジョブを処理中に更新
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'processing',
        theme_key: body.theme || job.theme_key || 'clean_light',
        harmony_pattern: body.harmony,
        processing_started_at: new Date().toISOString(),
        estimated_completion_at: new Date(
          Date.now() + (60000 * processingTimeMultiplier) // 基本1分 × 倍率
        ).toISOString(),
        processing_params: {
          accuracy: accuracyParams,
          theme: themeParams,
          planCode: planCode
        }
      })
      .eq('id', jobId)

    if (updateError) {
      throw new ApiError(500, 'Failed to update job status')
    }

    // バックグラウンドでMIX処理を開始（実際にはWorkerが処理）
    // ここではジョブをキューに追加するだけ
    await queueMixProcessing(jobId, userId, {
      accuracyParams,
      themeParams,
      harmonyPattern: body.harmony,
      planCode
    })

    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      estimatedTime: 60 * processingTimeMultiplier,
      processingAccuracy: planCode === 'freetrial' || planCode === 'creator' ? 'ultra-high' :
                         planCode === 'standard' || planCode === 'prepaid' ? 'high' : 'standard'
    })

  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.status, { 
        code: 'process_error', 
        message: error.message 
      })
    }
    return errorResponse(500, { 
      code: 'process_error', 
      message: 'MIX処理の開始に失敗しました', 
      details: error 
    })
  }
}

// MIX処理をキューに追加（実際のWorker呼び出し）
async function queueMixProcessing(
  jobId: string, 
  userId: string,
  params: any
) {
  // Supabaseのジョブキューテーブルに追加
  const { error } = await supabase
    .from('processing_queue')
    .insert({
      job_id: jobId,
      user_id: userId,
      status: 'pending',
      priority: params.planCode === 'creator' ? 10 : 
                params.planCode === 'standard' ? 5 : 1,
      processing_params: params,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to queue job:', error)
    throw new ApiError(500, 'Failed to queue processing job')
  }

  // Edge Functionをトリガー（非同期）
  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-mix`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jobId, userId, params })
  }).catch(err => {
    console.error('Failed to trigger processing:', err)
  })
}