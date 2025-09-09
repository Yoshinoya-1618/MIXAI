import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
})

// プラン情報のマッピング
const PLAN_PRICE_IDS: Record<string, string> = {
  lite: process.env.STRIPE_PRICE_LITE!,
  standard: process.env.STRIPE_PRICE_STANDARD!,
  creator: process.env.STRIPE_PRICE_CREATOR!,
}

export async function POST(request: Request) {
  try {
    const { planCode, trial = false, trialDays = 7 } = await request.json()
    
    if (!planCode) {
      return NextResponse.json({ error: 'プランを選択してください' }, { status: 400 })
    }

    // Supabaseでユーザー取得
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    // 既存のサブスクリプションをチェック
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingSub && existingSub.status === 'active' && !existingSub.trial_ends_at) {
      return NextResponse.json({ 
        error: '既に有効なサブスクリプションがあります' 
      }, { status: 400 })
    }

    // Stripe顧客を取得または作成
    let customerId = existingSub?.stripe_customer_id

    if (!customerId) {
      // 既存の顧客を検索
      const { data: billingCustomer } = await supabase
        .from('billing_customers')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single()

      if (billingCustomer) {
        customerId = billingCustomer.stripe_customer_id
      } else {
        // 新規顧客を作成
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            user_id: user.id,
          },
        })
        customerId = customer.id

        // データベースに保存
        await supabase
          .from('billing_customers')
          .insert({
            user_id: user.id,
            stripe_customer_id: customerId,
            email: user.email,
          })
      }
    }

    const priceId = PLAN_PRICE_IDS[planCode]
    if (!priceId) {
      return NextResponse.json({ error: '無効なプランです' }, { status: 400 })
    }

    // Checkout セッションを作成
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        user_id: user.id,
        plan_code: planCode,
        is_trial: trial ? 'true' : 'false',
      },
      // 規約同意の収集
      consent_collection: {
        terms_of_service: 'required',
      },
      // トライアル設定
      ...(trial && {
        subscription_data: {
          trial_period_days: trialDays,
          metadata: {
            trial_selected_plan: planCode,
          },
        },
      }),
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // トライアル開始をログ記録
    if (trial) {
      await supabase
        .from('alerts')
        .insert({
          type: 'trial_start',
          message: `User started ${trialDays}-day trial for ${planCode} plan`,
          metadata: {
            user_id: user.id,
            plan_code: planCode,
            session_id: session.id,
          },
        })
    }

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'チェックアウトセッションの作成に失敗しました' },
      { status: 500 }
    )
  }
}