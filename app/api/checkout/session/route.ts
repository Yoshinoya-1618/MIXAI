import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase'

// Stripeキーのチェック（開発環境対応）
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const isStripeConfigured = stripeKey && !stripeKey.includes('placeholder')

const stripe = isStripeConfigured ? new Stripe(stripeKey, {
  apiVersion: '2023-10-16' as any,
}) : null

// プラン価格IDのマッピング
const PRICE_IDS = {
  lite: process.env.STRIPE_PRICE_LITE!,
  standard: process.env.STRIPE_PRICE_STANDARD!,
  creator: process.env.STRIPE_PRICE_CREATOR!,
}

export async function POST(request: NextRequest) {
  try {
    const { plan_code } = await request.json()
    
    // Stripeが設定されていない場合のフォールバック
    if (!stripe) {
      console.warn('Stripe is not configured. Using demo mode.')
      return NextResponse.json({
        checkout_url: `/subscribe/success?demo=true&plan=${plan_code}`,
        session_id: 'demo_session_' + Date.now(),
      })
    }
    
    // 入力検証
    if (!plan_code || !PRICE_IDS[plan_code as keyof typeof PRICE_IDS]) {
      return NextResponse.json(
        { error: 'Invalid plan code' },
        { status: 400 }
      )
    }

    // ユーザーセッション確認
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 既存のStripe顧客を確認
    const { data: billingCustomer } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    // Checkout Session作成
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price: PRICE_IDS[plan_code as keyof typeof PRICE_IDS],
          quantity: 1,
        },
      ],
      // 7日間無料トライアル
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          user_id: user.id,
          plan_code: plan_code,
        },
      },
      // 請求先情報収集
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      // カスタムフィールド（会社情報）
      custom_fields: [
        {
          key: 'company',
          label: {
            type: 'custom',
            custom: '会社名（任意）',
          },
          type: 'text',
          optional: true,
        },
        {
          key: 'department',
          label: {
            type: 'custom',
            custom: '部署（任意）',
          },
          type: 'text',
          optional: true,
        },
        {
          key: 'bill_to',
          label: {
            type: 'custom',
            custom: '請求書宛名（任意）',
          },
          type: 'text',
          optional: true,
        },
      ],
      // 成功・キャンセルURL
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/cancel`,
      // メタデータ
      metadata: {
        user_id: user.id,
        user_email: user.email || '',
      },
      // 利用規約への同意
      consent_collection: {
        terms_of_service: 'required',
      },
      // カスタムテキスト
      custom_text: {
        terms_of_service_acceptance: {
          message: 'MIXAIの利用規約、プライバシーポリシー、特定商取引法に基づく表示に同意します',
        },
      },
    }

    // 既存顧客がいる場合は紐付け
    if (billingCustomer?.stripe_customer_id) {
      sessionParams.customer = billingCustomer.stripe_customer_id
    } else {
      sessionParams.customer_creation = 'always'
      sessionParams.customer_email = user.email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (error) {
    console.error('Checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}