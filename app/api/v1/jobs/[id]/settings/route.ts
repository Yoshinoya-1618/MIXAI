// app/api/v1/jobs/[id]/settings/route.ts
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

const UpdateSettingsSchema = z.object({
  preset_key: z.string().optional(),
  theme_key: z.string().optional(), // テーマ選択（MIX前）
  micro_adjust: z.object({
    forwardness: z.number().min(-1).max(1).optional(),
    space: z.number().min(0).max(1).optional(), 
    brightness: z.number().min(-1).max(1).optional()
  }).optional(),
  inst_policy: z.enum(['bypass', 'safety', 'rescue']).optional()
})

// PATCH /v1/jobs/:id/settings - 設定更新（Standard/Creator）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await authenticateUser(request)
    const body = await validateJson(request, UpdateSettingsSchema)
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

    // statusがuploadedまたはprocessing以外なら設定変更不可
    if (!['uploaded', 'paid'].includes(job.status)) {
      throw new ApiError(400, 'Cannot update settings for jobs in this status')
    }

    // ユーザーのプラン確認（Standard/Creatorのみ微調整可）
    const { data: subscription } = await supabase
      .rpc('get_active_subscription', { user_uuid: userId })
      .single()

    if (body.micro_adjust && (!subscription || (subscription as any).plan_code === 'lite')) {
      throw new ApiError(403, 'Micro adjustments require Standard or Creator plan')
    }

    // 設定更新
    const updateData: any = {}
    if (body.preset_key) updateData.preset_key = body.preset_key
    if (body.theme_key) updateData.theme_key = body.theme_key // テーマ保存
    if (body.micro_adjust) updateData.micro_adjust = body.micro_adjust
    if (body.inst_policy) updateData.inst_policy = body.inst_policy

    const { data: updatedJob, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single()

    if (error) {
      throw new ApiError(500, error.message)
    }

    return Response.json({
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        preset_key: updatedJob.preset_key,
        theme_key: updatedJob.theme_key,
        micro_adjust: updatedJob.micro_adjust,
        inst_policy: updatedJob.inst_policy
      }
    })

  } catch (error) {
    return errorResponse(500, { code: 'settings_error', message: 'ジョブ設定の更新に失敗しました', details: error })
  }
}