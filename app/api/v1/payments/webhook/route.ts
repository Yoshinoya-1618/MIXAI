// app/api/v1/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature } from '../../../../../payments/stripe'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /v1/payments/webhook - Stripe Webhook処理
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!
    
    // Webhook署名検証
    const event = await verifyWebhookSignature(body, signature)
    
    console.log(`Received Stripe webhook: ${event.type}`)
    
    // Idempotency チェック
    const { data: existingEvent } = await supabase
      .from('idempotency_keys')
      .select('*')
      .eq('key', event.id)
      .eq('type', 'stripe_webhook')
      .maybeSingle()

    if (existingEvent) {
      console.log(`Webhook ${event.id} already processed`)
      return NextResponse.json({ received: true })
    }

    // Idempotency記録
    await supabase
      .from('idempotency_keys')
      .insert({
        key: event.id,
        type: 'stripe_webhook',
        data: { eventType: event.type, processed: true }
      })

    // イベント別処理
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing failed:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' }, 
      { status: 400 }
    )
  }
}

/**
 * チェックアウト完了処理
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id
  const metadata = session.metadata!
  
  if (!userId) {
    console.error('No user ID in checkout session')
    return
  }

  if (metadata.type === 'subscription') {
    // サブスクリプション決済完了
    console.log(`Subscription checkout completed for user ${userId}`)
    
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        stripe_subscription_id: session.subscription as string,
        stripe_customer_id: session.customer as string,
        plan_code: metadata.planCode,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      })

    if (error) {
      console.error('Failed to create subscription record:', error)
    }
    
    // 月次クレジット付与
    await grantMonthlyCredits(userId, metadata.planCode)
    
  } else if (metadata.type === 'one_time') {
    // 単発決済完了
    console.log(`One-time payment completed for user ${userId}`)
    
    // ジョブのステータス更新
    if (metadata.jobId) {
      await supabase
        .from('jobs')
        .update({ status: 'paid' })
        .eq('id', metadata.jobId)
        .eq('user_id', userId)
    }
    
    // 決済履歴記録
    await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        type: 'payment',
        amount: parseInt(metadata.amount),
        description: `単発決済: ${session.amount_total! / 100}円`,
        stripe_payment_intent_id: session.payment_intent as string
      })
  }
}

/**
 * サブスクリプション作成処理
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`Subscription created: ${subscription.id}`)
  
  // メタデータからユーザーIDとプランを取得
  const userId = subscription.metadata?.userId
  const planCode = subscription.metadata?.planCode
  
  if (!userId || !planCode) {
    console.error('Missing userId or planCode in subscription metadata')
    return
  }

  // サブスクリプション記録の更新（既に存在する場合）
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date((subscription as any).current_period_start * 1000),
      current_period_end: new Date((subscription as any).current_period_end * 1000),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Failed to update subscription:', error)
  }
}

/**
 * サブスクリプション更新処理
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`Subscription updated: ${subscription.id}`)
  
  const status = mapStripeStatus(subscription.status)
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status,
      current_period_start: new Date((subscription as any).current_period_start * 1000),
      current_period_end: new Date((subscription as any).current_period_end * 1000),
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Failed to update subscription:', error)
  }
}

/**
 * サブスクリプション削除処理
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`Subscription deleted: ${subscription.id}`)
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Failed to mark subscription as canceled:', error)
  }
}

/**
 * 請求書支払い成功処理
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Invoice payment succeeded: ${invoice.id}`)
  
  if ((invoice as any).subscription) {
    // サブスクリプション更新処理でクレジット付与
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id, plan_code')
      .eq('stripe_subscription_id', (invoice as any).subscription)
      .single()
    
    if (subscription) {
      await grantMonthlyCredits(subscription.user_id, subscription.plan_code)
    }
  }
}

/**
 * 請求書支払い失敗処理  
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Invoice payment failed: ${invoice.id}`)
  
  if ((invoice as any).subscription) {
    // 支払い失敗の記録
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', (invoice as any).subscription)
      .single()
    
    if (subscription) {
      await supabase
        .from('credit_ledger')
        .insert({
          user_id: subscription.user_id,
          type: 'payment_failed',
          amount: 0,
          description: `請求書支払い失敗: ${invoice.id}`,
          stripe_invoice_id: invoice.id
        })
    }
  }
}

/**
 * 月次クレジット付与
 */
async function grantMonthlyCredits(userId: string, planCode: string) {
  const credits = planCode === 'standard' ? 50 : planCode === 'creator' ? 200 : 0
  
  if (credits > 0) {
    await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        type: 'monthly_grant',
        amount: credits,
        description: `${planCode.toUpperCase()}プラン月次クレジット`
      })
  }
}

/**
 * Stripeステータス変換
 */
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    case 'past_due':
      return 'past_due'
    case 'unpaid':
      return 'unpaid'
    default:
      return 'inactive'
  }
}