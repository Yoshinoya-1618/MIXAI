// app/api/v1/mix/harmony/apply/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../../../_lib/auth'
import { ApiError, errorResponse } from '../../../../_lib/errors'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /v1/mix/harmony/apply - ハモリ確定（プラン別課金）
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const { jobId, choice, level_db = -6 } = await request.json()

    if (!jobId || !choice) {
      throw new ApiError(400, 'jobId and choice are required')
    }

    const validChoices = ['up_m3', 'down_m3', 'p5', 'up_down', 'none']
    if (!validChoices.includes(choice)) {
      throw new ApiError(400, 'Invalid harmony choice')
    }

    console.log(`🎵 Applying harmony ${choice} for job ${jobId}`)

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

    // プラン確認（課金計算用）
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_code')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    const planCode = subscription?.plan_code || 'lite'

    // プラン別課金
    let creditsCost = 0
    if (choice !== 'none') {
      if (planCode === 'lite') {
        creditsCost = 0.5 // Liteプランのみハモリ確定で0.5C消費
      } else {
        creditsCost = 0 // Standard/Creatorは0C
      }
    }

    // クレジット残高確認（Liteプランの場合）
    if (creditsCost > 0) {
      const { data: balance } = await supabase
        .rpc('get_credit_balance', { target_user_id: userId })

      if (!balance || balance < creditsCost) {
        throw new ApiError(402, 'Insufficient credits')
      }

      // クレジット消費を台帳に記録
      await supabase
        .from('credit_ledger')
        .insert({
          user_id: userId,
          event: 'consume',
          credits: -creditsCost,
          reason: `Harmony application: ${choice}`,
          job_id: jobId
        })
    }

    // ジョブにハモリ設定を保存
    await supabase
      .from('jobs')
      .update({
        harmony_choice: choice,
        harmony_level_db: level_db,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`✅ Harmony applied for job ${jobId}: ${choice} at ${level_db}dB`)

    return Response.json({
      success: true,
      harmony_choice: choice,
      harmony_level_db: level_db,
      credits_delta: creditsCost > 0 ? -creditsCost : undefined,
      plan_code: planCode,
      meta: {
        job_id: jobId,
        applied_choice: choice,
        level_db: level_db
      }
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'harmony_apply_error', 
      message: 'ハモリ適用に失敗しました', 
      details: error 
    })
  }
}

// GET /v1/mix/harmony/apply - ハモリ設定取得
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateUser(request)
    const userId = user.id
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      throw new ApiError(400, 'jobId is required')
    }

    // ジョブのハモリ設定を取得
    const { data: job } = await supabase
      .from('jobs')
      .select('harmony_choice, harmony_level_db, harmony_generated')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single()

    if (!job) {
      throw new ApiError(404, 'Job not found or access denied')
    }

    return Response.json({
      success: true,
      harmony_choice: job.harmony_choice || 'none',
      harmony_level_db: job.harmony_level_db || -6,
      harmony_generated: job.harmony_generated || false
    })

  } catch (error) {
    return errorResponse(500, { 
      code: 'get_harmony_error', 
      message: 'ハモリ設定の取得に失敗しました', 
      details: error 
    })
  }
}