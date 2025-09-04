import { NextRequest, NextResponse } from 'next/server'
import { badRequest, notFound, unauthorized, handleApiError } from '../../../../_lib/errors'
import { getSupabaseWithRLS } from '../../../../_lib/auth'
import { jobIdParam } from '../../../../_lib/validation'
import { getIdempotencyKey, checkIdempotencyKey, storeIdempotencyResponse } from '../../../../_lib/idempotency'
import { checkRateLimit, addRateLimitHeaders } from '../../../../_lib/ratelimit'
import { createPayment } from 'payments'

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  // レート制限チェック
  const rateLimitResponse = checkRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse
  try {
    const parsed = jobIdParam.safeParse(ctx.params)
    if (!parsed.success) return badRequest('Invalid job id')

    let supabase
    try {
      supabase = getSupabaseWithRLS(req)
    } catch (resp: any) {
      return resp
    }
    
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes.user) return unauthorized('ユーザー情報を取得できません')

    // RLSにより本人以外は取得不可
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', parsed.data.id)
      .single()
    if (jobErr || !job) return notFound('ジョブが見つかりません')

    // 冪等化: すでに paid 以降なら200で返す
    if (job.status === 'paid' || job.status === 'processing' || job.status === 'done') {
      return NextResponse.json({ 
        status: job.status,
        message: '決済は既に完了しています'
      }, { status: 200 })
    }

    // Idempotency処理
    const idempotencyKey = getIdempotencyKey(req) || `job_${parsed.data.id}_${Date.now()}`
    const idempotencyResult = await checkIdempotencyKey(idempotencyKey)
    
    if (!idempotencyResult.isNewRequest && idempotencyResult.storedResponse) {
      // 既に処理済みのリクエスト: 保存されたレスポンスを返す
      console.log(`Returning cached response for idempotency key: ${idempotencyKey}`)
      return NextResponse.json(idempotencyResult.storedResponse)
    }

    // 決済作成（Stripe統合 or モック）
    const amount = Number(process.env.PRICE_JPY || 150)
    
    const payment = await createPayment({ 
      jobId: parsed.data.id, 
      amount, 
      currency: 'jpy', 
      idempotencyKey,
      customerEmail: userRes.user.email || undefined
    })

    if (!payment.ok) {
      console.error('Payment creation failed:', payment.error)
      return NextResponse.json({ 
        code: 'payment_required', 
        message: '決済に失敗しました', 
        details: payment.error 
      }, { status: 402 })
    }

    // レスポンス作成とIdempotency記録
    let response: any

    // Stripe決済の場合はclient_secretを返してフロント側で決済完了を待つ
    if (payment.provider === 'stripe') {
      response = {
        payment_intent: {
          id: payment.paymentIntent.id,
          client_secret: payment.paymentIntent.client_secret,
          status: payment.paymentIntent.status
        },
        provider: 'stripe',
        message: 'Stripe決済を開始してください'
      }
      
      await storeIdempotencyResponse(idempotencyKey, response)
      const stripeResponse = NextResponse.json(response, { status: 200 })
      return addRateLimitHeaders(stripeResponse, req)
    }

    // モック決済の場合は即座にpaid状態に更新
    if (payment.provider === 'mock') {
      const { data: updated, error: updErr } = await supabase
        .from('jobs')
        .update({ status: 'paid' })
        .eq('id', parsed.data.id)
        .select('id, status')
        .single()
      if (updErr || !updated) return badRequest('ステータス更新に失敗しました')
      
      response = { 
        status: updated.status,
        provider: 'mock',
        message: '決済が完了しました'
      }
      
      await storeIdempotencyResponse(idempotencyKey, response)
      const mockResponse = NextResponse.json(response, { status: 200 })
      return addRateLimitHeaders(mockResponse, req)
    }

    return badRequest('不明な決済プロバイダです')

  } catch (error) {
    return handleApiError(error, '決済処理')
  }
}
