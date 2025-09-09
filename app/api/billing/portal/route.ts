import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase'

// Stripeキーのチェック（開発環境対応）
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
const isStripeConfigured = stripeKey && !stripeKey.includes('placeholder')

const stripe = isStripeConfigured ? new Stripe(stripeKey, {
  apiVersion: '2023-10-16' as any,
}) : null

export async function POST(request: NextRequest) {
  try {
    // Stripeが設定されていない場合のフォールバック
    if (!stripe) {
      console.warn('Stripe is not configured. Using demo mode.')
      return NextResponse.json({
        url: '/mypage?demo=true',
      })
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

    // Stripe顧客IDを取得
    const { data: billingCustomer, error: dbError } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (dbError || !billingCustomer?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing customer found. Please subscribe first.' },
        { status: 404 }
      )
    }

    // Billing Portalセッションを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: billingCustomer.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/return`,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    console.error('Billing portal session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
}