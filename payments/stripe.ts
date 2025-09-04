/**
 * Stripe決済ライブラリ - CLAUDE.md準拠
 * プラン: Lite（無料）、Standard（490円/月）、Creator（1,490円/月）
 */
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    })
  : null

// プラン定義（CLAUDE.mdに準拠）
export const PLANS = {
  lite: {
    code: 'lite',
    name: 'Lite',
    price: 0,
    priceId: null, // 無料プランなのでprice_idなし
    features: {
      presets: 3,
      microAdjust: false,
      instPolicy: false,
      monthlyCredits: 5,
      maxDuration: 60
    },
    description: 'お試し利用に最適'
  },
  standard: {
    code: 'standard', 
    name: 'Standard',
    price: 490,
    priceId: process.env.STRIPE_STANDARD_PRICE_ID!,
    features: {
      presets: 7,
      microAdjust: true,
      instPolicy: true, 
      monthlyCredits: 50,
      maxDuration: 180
    },
    description: '個人利用におすすめ'
  },
  creator: {
    code: 'creator',
    name: 'Creator',
    price: 1490,
    priceId: process.env.STRIPE_CREATOR_PRICE_ID!,
    features: {
      presets: 12,
      microAdjust: true,
      instPolicy: true,
      monthlyCredits: 200,
      maxDuration: 300,
      worldResynth: true
    },
    description: 'プロフェッショナル向け'
  }
} as const

export type PlanCode = keyof typeof PLANS

/**
 * サブスクリプション作成（チェックアウトセッション）
 */
export async function createSubscriptionCheckout(
  userId: string,
  planCode: Exclude<PlanCode, 'lite'>,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  if (!stripe) throw new Error('Stripe is not configured')
  
  const plan = PLANS[planCode]
  
  if (!plan.priceId) {
    throw new Error(`Plan ${planCode} does not have a priceId`)
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: undefined, // 後でSupabaseのemailと紐付け
    client_reference_id: userId,
    mode: 'subscription',
    line_items: [{
      price: plan.priceId,
      quantity: 1,
    }],
    metadata: {
      userId,
      planCode,
      type: 'subscription'
    },
    subscription_data: {
      metadata: {
        userId,
        planCode
      }
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  })

  return session
}

/**
 * 単発決済作成（Pay-per-use）
 */
export async function createOneTimePayment(
  userId: string,
  amount: number, // 円単位
  description: string,
  successUrl: string,
  cancelUrl: string,
  jobId?: string
): Promise<Stripe.Checkout.Session> {
  if (!stripe) throw new Error('Stripe is not configured')
  
  const session = await stripe.checkout.sessions.create({
    client_reference_id: userId,
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'jpy',
        product_data: {
          name: description,
          description: `うた整音 - ${description}`,
        },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    metadata: {
      userId,
      jobId: jobId || '',
      type: 'one_time',
      amount: amount.toString()
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'required',
  })

  return session
}

/**
 * サブスクリプション取得
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) throw new Error('Stripe is not configured')
  
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Failed to retrieve subscription:', error)
    return null
  }
}

/**
 * サブスクリプション取消
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (!stripe) throw new Error('Stripe is not configured')
  
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  })
}

/**
 * 顧客ポータルセッション作成
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) throw new Error('Stripe is not configured')
  
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

/**
 * Webhookイベント検証
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  if (!stripe) throw new Error('Stripe is not configured')
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  
  try {
    return stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * プラン情報取得
 */
export function getPlan(planCode: PlanCode) {
  return PLANS[planCode]
}

/**
 * 全プラン取得
 */
export function getAllPlans() {
  return Object.values(PLANS)
}

/**
 * プラン比較（アップグレード判定用）
 */
export function comparePlans(currentPlan: PlanCode, targetPlan: PlanCode): number {
  const planOrder: PlanCode[] = ['lite', 'standard', 'creator']
  const currentIndex = planOrder.indexOf(currentPlan)
  const targetIndex = planOrder.indexOf(targetPlan)
  return targetIndex - currentIndex // 正の値ならアップグレード
}

/**
 * 使用量チェック
 */
export function checkPlanLimits(planCode: PlanCode, usage: {
  monthlyCredits: number
  maxDuration: number
}) {
  const plan = PLANS[planCode]
  
  return {
    creditsOk: usage.monthlyCredits <= plan.features.monthlyCredits,
    durationOk: usage.maxDuration <= plan.features.maxDuration,
    plan
  }
}

export { stripe }