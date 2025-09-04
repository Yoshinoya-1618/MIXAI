// app/api/v1/payments/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseWithRLS } from '../../../_lib/auth'
import { badRequest, unauthorized, handleApiError } from '../../../_lib/errors'
import { checkRateLimit, addRateLimitHeaders } from '../../../_lib/ratelimit'
import { createSubscriptionCheckout, createOneTimePayment, PLANS } from '../../../../../payments/stripe'
import { z } from 'zod'

const CheckoutSchema = z.object({
  type: z.enum(['subscription', 'one_time']),
  planCode: z.enum(['standard', 'creator']).optional(),
  amount: z.number().optional(),
  jobId: z.string().optional(),
  description: z.string().optional()
})

// POST /v1/payments/checkout - チェックアウトセッション作成
export async function POST(req: NextRequest) {
  // レート制限チェック
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    let supabase
    try {
      supabase = getSupabaseWithRLS(req)
    } catch (resp: any) {
      return resp
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return unauthorized('ユーザー情報を取得できません')
    const uid = userRes.user.id

    const body = await req.json()
    const parsed = CheckoutSchema.parse(body)
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}/checkout/cancel`

    let session

    if (parsed.type === 'subscription') {
      if (!parsed.planCode) {
        return badRequest('planCode is required for subscription')
      }

      // 既存のアクティブなサブスクリプションをチェック
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', uid)
        .eq('status', 'active')
        .maybeSingle()

      if (existingSub) {
        return badRequest('既にアクティブなサブスクリプションが存在します')
      }

      session = await createSubscriptionCheckout(
        uid,
        parsed.planCode,
        successUrl,
        cancelUrl
      )

    } else {
      // 単発決済
      if (!parsed.amount || !parsed.description) {
        return badRequest('amount and description are required for one_time payment')
      }

      session = await createOneTimePayment(
        uid,
        parsed.amount,
        parsed.description,
        successUrl,
        cancelUrl,
        parsed.jobId
      )
    }

    // Idempotency記録
    await supabase
      .from('idempotency_keys')
      .insert({
        key: session.id,
        user_id: uid,
        type: 'stripe_checkout',
        data: {
          sessionId: session.id,
          type: parsed.type,
          planCode: parsed.planCode,
          amount: parsed.amount
        }
      })

    const response = NextResponse.json({
      sessionId: session.id,
      url: session.url,
      type: parsed.type
    })

    return addRateLimitHeaders(response, req)

  } catch (error) {
    return handleApiError(error, '決済セッション作成')
  }
}