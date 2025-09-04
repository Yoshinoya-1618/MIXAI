// app/api/v1/jobs/[id]/repitch/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../../_lib/auth'
import { ApiError, errorResponse } from '../../../../_lib/errors'
import { validateJson } from '../../../../_lib/json'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RepitchSchema = z.object({
  start_ms: z.number().min(0),
  end_ms: z.number().min(0),
  correction_cents: z.number().min(-50).max(50),
  preserve_formants: z.boolean().optional().default(true)
})

// POST /v1/jobs/:id/repitch - 単一区間のピッチ補正適用
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticateUser(request)
    const body = await validateJson(request, RepitchSchema)
    const jobId = params.id

    if (body.end_ms <= body.start_ms) {
      throw new ApiError(400, 'end_ms must be greater than start_ms')
    }

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

    if (!['uploaded', 'paid'].includes(job.status)) {
      throw new ApiError(400, 'Cannot apply pitch correction for jobs in this status')
    }

    // ユーザーのプラン確認（Standard/Creatorのみピッチ補正可）
    const { data: subscription } = await supabase
      .rpc('get_active_subscription', { user_uuid: userId })
      .single()

    if (!subscription || (subscription as any).plan_code === 'lite') {
      throw new ApiError(403, 'Pitch correction requires Standard or Creator plan')
    }

    // TODO: 実際のピッチ補正処理を実装
    // Worker/FFmpeg/Rubber Bandへのジョブキューイング
    
    // 仮実装として成功レスポンスを返す
    const correctionResult = {
      start_ms: body.start_ms,
      end_ms: body.end_ms,
      applied_correction_cents: body.correction_cents,
      success: true,
      processing_time_ms: Math.floor(Math.random() * 2000) + 500
    }

    // ジョブの補正適用フラグを更新
    await supabase
      .from('jobs')
      .update({
        // 適用された補正履歴をJSONBで保存
        micro_adjust: {
          ...job.micro_adjust,
          pitch_corrections: [
            ...(job.micro_adjust?.pitch_corrections || []),
            correctionResult
          ]
        }
      })
      .eq('id', jobId)

    return Response.json({
      correction: correctionResult
    })

  } catch (error) {
    return errorResponse(500, { code: 'repitch_error', message: 'ピッチ補正に失敗しました', details: error })
  }
}