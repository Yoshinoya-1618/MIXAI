import { NextRequest, NextResponse } from 'next/server'
import { badRequest, unauthorized, handleApiError } from '../../../_lib/errors'
import { createServiceSupabase } from 'storage/supabaseClient'
import { verifyStripeWebhook, convertStripeEvent } from 'payments'

export async function POST(req: NextRequest) {
  try {
    const paymentProvider = process.env.PAYMENT_PROVIDER

    // Stripe Webhook処理
    if (paymentProvider === 'stripe') {
      return await handleStripeWebhook(req)
    }

    // レガシーモック Webhook処理
    return await handleMockWebhook(req)

  } catch (error) {
    return handleApiError(error, 'Payment webhook処理')
  }
}

// Stripe Webhook処理
async function handleStripeWebhook(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return unauthorized('Stripe signature missing')
  }

  // リクエストボディを生テキストとして取得
  const payload = await req.text()
  
  // Stripe署名検証
  const event = verifyStripeWebhook(payload, signature)
  if (!event) {
    return unauthorized('Invalid Stripe signature')
  }

  console.log(`Received Stripe webhook: ${event.type}`)

  // Stripe EventをPaymentEventに変換
  const paymentEvent = convertStripeEvent(event)
  if (!paymentEvent) {
    // 処理対象外のイベント
    return NextResponse.json({ received: true, ignored: true, type: event.type })
  }

  const jobId = paymentEvent.data.job_id
  if (!jobId) {
    return badRequest('Missing job_id in event data')
  }

  // UUIDフォーマット検証
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(jobId)) {
    return badRequest('Invalid job_id format')
  }

  const supabase = createServiceSupabase()

  if (paymentEvent.type === 'payment_succeeded') {
    // 冪等性チェック
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('status')
      .eq('id', jobId)
      .single()

    if (existingJob?.status === 'paid' || existingJob?.status === 'processing' || existingJob?.status === 'done') {
      return NextResponse.json({ 
        received: true, 
        id: paymentEvent.id, 
        note: 'already_processed' 
      })
    }

    // ステータス更新
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'paid' })
      .eq('id', jobId)
      .eq('status', 'uploaded')
      
    if (error) {
      console.error('Stripe webhook update error:', error)
      return badRequest('更新に失敗しました', { supabaseError: error.message })
    }

    console.log(`Job ${jobId} marked as paid via Stripe webhook`)
  }

  if (paymentEvent.type === 'payment_failed') {
    const { error } = await supabase
      .from('jobs')
      .update({ error: 'payment_failed_stripe' })
      .eq('id', jobId)

    if (error) {
      console.error('Stripe payment failure webhook error:', error)
    }

    console.log(`Job ${jobId} marked as payment failed via Stripe webhook`)
  }

  return NextResponse.json({ received: true, id: paymentEvent.id })
}

// レガシーモック Webhook処理
async function handleMockWebhook(req: NextRequest) {
  const secret = req.headers.get('Payment-Secret')
  if (!secret || secret !== process.env.PAYMENT_SECRET) {
    return unauthorized('Webhook シークレットが不正です')
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const eventId = body?.id
  const type = body?.type
  const jobId = body?.data?.job_id
  if (!eventId || !type || !jobId) {
    return badRequest('Missing fields (id/type/data.job_id)')
  }

  // UUIDフォーマット検証
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(jobId)) {
    return badRequest('Invalid job_id format')
  }

  const supabase = createServiceSupabase()

  if (type === 'payment_succeeded') {
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('status')
      .eq('id', jobId)
      .single()

    if (existingJob?.status === 'paid' || existingJob?.status === 'processing' || existingJob?.status === 'done') {
      return NextResponse.json({ received: true, id: eventId, note: 'already_processed' })
    }

    const { error } = await supabase
      .from('jobs')
      .update({ status: 'paid' })
      .eq('id', jobId)
      .eq('status', 'uploaded')
      
    if (error) {
      console.error('Mock payment webhook update error:', error)
      return badRequest('更新に失敗しました', { supabaseError: error.message })
    }
  }

  if (type === 'payment_failed') {
    const { error } = await supabase
      .from('jobs')
      .update({ error: 'payment_failed_mock' })
      .eq('id', jobId)

    if (error) {
      console.error('Mock payment failure webhook error:', error)
    }
  }

  return NextResponse.json({ received: true, id: eventId })
}
