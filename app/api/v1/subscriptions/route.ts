// app/api/v1/subscriptions/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateUser } from '../../_lib/auth'
import { ApiError, errorResponse } from '../../_lib/errors'
import { validateJson } from '../../_lib/json'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CreateSubscriptionSchema = z.object({
  plan_code: z.enum(['lite', 'standard', 'creator']),
  auto_renew: z.boolean().optional().default(true),
  auto_buy_addon: z.boolean().optional().default(true)
})

// POST /v1/subscriptions - プラン申込
export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateUser(request)
    const body = await validateJson(request, CreateSubscriptionSchema)

    // 既存のアクティブサブスクリプションをチェック
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (existing) {
      throw new ApiError(409, 'User already has an active subscription')
    }

    // プランの詳細を取得
    const { data: plan } = await supabase
      .from('plans')
      .select('*')
      .eq('code', body.plan_code)
      .single()

    if (!plan) {
      throw new ApiError(404, 'Plan not found')
    }

    // サブスクリプションを作成
    const now = new Date()
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30日後

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_code: body.plan_code,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        auto_renew: body.auto_renew,
        auto_buy_addon: body.auto_buy_addon
      })
      .select()
      .single()

    if (error) {
      throw new ApiError(500, error.message)
    }

    // 初回クレジットを付与
    await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        event: 'grant',
        credits: plan.monthly_credits,
        reason: `Initial credits for ${plan.name} plan`
      })

    return Response.json({
      subscription: {
        id: subscription.id,
        plan_code: subscription.plan_code,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        auto_renew: subscription.auto_renew,
        auto_buy_addon: subscription.auto_buy_addon
      }
    })

  } catch (error) {
    return errorResponse(500, { code: 'subscription_error', message: 'サブスクリプション処理に失敗しました', details: error })
  }
}

// GET /v1/subscriptions - サブスクリプション情報取得
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateUser(request)

    const { data: subscription } = await supabase
      .rpc('get_active_subscription', { user_uuid: userId })
      .single()

    if (!subscription) {
      return Response.json({ subscription: null })
    }

    return Response.json({ subscription })

  } catch (error) {
    return errorResponse(500, { code: 'subscription_error', message: 'サブスクリプション処理に失敗しました', details: error })
  }
}

const UpdateSubscriptionSchema = z.object({
  plan_code: z.enum(['lite', 'standard', 'creator']).optional(),
  auto_renew: z.boolean().optional(),
  auto_buy_addon: z.boolean().optional()
})

// PATCH /v1/subscriptions - プラン変更・設定更新
export async function PATCH(request: NextRequest) {
  try {
    const userId = await authenticateUser(request)
    const body = await validateJson(request, UpdateSubscriptionSchema)

    // 現在のアクティブサブスクリプションを取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!subscription) {
      throw new ApiError(404, 'No active subscription found')
    }

    // 更新データを準備
    const updateData: any = {}
    if (body.auto_renew !== undefined) updateData.auto_renew = body.auto_renew
    if (body.auto_buy_addon !== undefined) updateData.auto_buy_addon = body.auto_buy_addon

    // プラン変更の場合は即時反映
    if (body.plan_code && body.plan_code !== subscription.plan_code) {
      updateData.plan_code = body.plan_code
    }

    const { data: updatedSubscription, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscription.id)
      .select()
      .single()

    if (error) {
      throw new ApiError(500, error.message)
    }

    return Response.json({
      subscription: {
        id: updatedSubscription.id,
        plan_code: updatedSubscription.plan_code,
        status: updatedSubscription.status,
        current_period_start: updatedSubscription.current_period_start,
        current_period_end: updatedSubscription.current_period_end,
        auto_renew: updatedSubscription.auto_renew,
        auto_buy_addon: updatedSubscription.auto_buy_addon
      }
    })

  } catch (error) {
    return errorResponse(500, { code: 'subscription_error', message: 'サブスクリプション処理に失敗しました', details: error })
  }
}

// DELETE /v1/subscriptions - 解約（次回更新で停止）
export async function DELETE(request: NextRequest) {
  try {
    const userId = await authenticateUser(request)

    // 現在のアクティブサブスクリプションを取得
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (!subscription) {
      throw new ApiError(404, 'No active subscription found')
    }

    // auto_renewをfalseに設定（次回更新で停止）
    const { data: updatedSubscription, error } = await supabase
      .from('subscriptions')
      .update({ 
        auto_renew: false,
        status: 'canceled' 
      })
      .eq('id', subscription.id)
      .select()
      .single()

    if (error) {
      throw new ApiError(500, error.message)
    }

    return Response.json({
      subscription: {
        id: updatedSubscription.id,
        plan_code: updatedSubscription.plan_code,
        status: updatedSubscription.status,
        current_period_start: updatedSubscription.current_period_start,
        current_period_end: updatedSubscription.current_period_end,
        auto_renew: updatedSubscription.auto_renew,
        auto_buy_addon: updatedSubscription.auto_buy_addon
      }
    })

  } catch (error) {
    return errorResponse(500, { code: 'subscription_error', message: 'サブスクリプション処理に失敗しました', details: error })
  }
}