import Stripe from 'stripe'

export type PaymentEvent = {
  id: string
  type: 'payment_succeeded' | 'payment_failed' | string
  data: { job_id?: string; amount?: number; currency?: string }
}

export type PaymentCreateInput = {
  jobId: string
  amount: number
  currency: string
  idempotencyKey?: string
  customerEmail?: string
}

export type PaymentResult = {
  ok: true
  paymentIntent: {
    id: string
    client_secret: string
    status: string
  }
  provider: string
} | {
  ok: false
  error: string
}

// Stripeクライアント初期化
function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    console.warn('STRIPE_SECRET_KEY not configured')
    return null
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
  })
}

// 実決済作成（Stripe統合）
export async function createPayment(input: PaymentCreateInput): Promise<PaymentResult> {
  const { jobId, amount, currency, idempotencyKey, customerEmail } = input

  // モード確認
  if (process.env.PAYMENT_PROVIDER !== 'stripe') {
    // モック決済モード
    if (!process.env.PAYMENT_SECRET) {
      return { ok: false, error: 'PAYMENT_NOT_CONFIGURED' }
    }
    return { 
      ok: true, 
      provider: 'mock',
      paymentIntent: {
        id: `mock_${Date.now()}`,
        client_secret: `mock_secret_${jobId}`,
        status: 'succeeded'
      }
    }
  }

  // Stripe決済処理
  const stripe = getStripeClient()
  if (!stripe) {
    return { ok: false, error: 'Stripe not configured properly' }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // 円→銭変換
      currency: currency.toLowerCase(),
      metadata: {
        job_id: jobId,
        source: 'uta-seion'
      },
      receipt_email: customerEmail,
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      idempotencyKey: idempotencyKey
    })

    return {
      ok: true,
      provider: 'stripe',
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret!,
        status: paymentIntent.status
      }
    }

  } catch (error) {
    console.error('Stripe payment creation failed:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return { 
        ok: false, 
        error: `Stripe error: ${error.message}` 
      }
    }
    
    return { 
      ok: false, 
      error: '決済処理でエラーが発生しました' 
    }
  }
}

// Stripe Webhook署名検証
export function verifyStripeWebhook(payload: string, signature: string): Stripe.Event | null {
  const stripe = getStripeClient()
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !endpointSecret) {
    console.warn('Stripe webhook verification failed: missing config')
    return null
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return null
  }
}

// Stripe Eventをうた整音形式に変換
export function convertStripeEvent(event: Stripe.Event): PaymentEvent | null {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    return {
      id: event.id,
      type: 'payment_succeeded',
      data: {
        job_id: paymentIntent.metadata.job_id,
        amount: paymentIntent.amount / 100, // 銭→円変換
        currency: paymentIntent.currency
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    return {
      id: event.id,
      type: 'payment_failed',
      data: {
        job_id: paymentIntent.metadata.job_id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      }
    }
  }

  return null
}

