import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
})

// クレジットパック情報
const CREDIT_PACKS = {
  mini: {
    name: 'ミニパック（2クレジット）',
    credits: 2,
    price: 1580,
    stripe_price_id: process.env.STRIPE_PRICE_PACK_MINI || 'price_mini_placeholder'
  },
  small: {
    name: 'スモールパック（5クレジット）',
    credits: 5,
    price: 3800,
    stripe_price_id: process.env.STRIPE_PRICE_PACK_SMALL || 'price_small_placeholder'
  },
  medium: {
    name: 'ミディアムパック（8クレジット）',
    credits: 8,
    price: 5920,
    stripe_price_id: process.env.STRIPE_PRICE_PACK_MEDIUM || 'price_medium_placeholder'
  },
  large: {
    name: 'ラージパック（12クレジット）',
    credits: 12,
    price: 8400,
    stripe_price_id: process.env.STRIPE_PRICE_PACK_LARGE || 'price_large_placeholder'
  }
}

export async function POST(request: Request) {
  try {
    const { packCode } = await request.json()
    
    if (!packCode || !CREDIT_PACKS[packCode as keyof typeof CREDIT_PACKS]) {
      return NextResponse.json({ error: '無効なパックが選択されました' }, { status: 400 })
    }

    const pack = CREDIT_PACKS[packCode as keyof typeof CREDIT_PACKS]

    // Supabaseでユーザー取得
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    // Stripe顧客を取得または作成
    let customerId: string | undefined

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

    // Stripe Checkout セッションを作成（都度決済）
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment', // 都度決済
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: pack.name,
              description: `MIXAIクレジット ${pack.credits}C`,
              metadata: {
                type: 'credit_pack',
                pack_code: packCode,
                credits: pack.credits.toString()
              }
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits`,
      metadata: {
        user_id: user.id,
        pack_code: packCode,
        credits: pack.credits.toString(),
        type: 'credit_pack'
      },
    })

    // 購入記録をログ
    await supabase
      .from('alerts')
      .insert({
        type: 'credit_pack_purchase_initiated',
        message: `User initiated purchase of ${packCode} pack (${pack.credits}C)`,
        metadata: {
          user_id: user.id,
          pack_code: packCode,
          session_id: session.id,
          credits: pack.credits,
          price: pack.price
        },
      })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Credit pack purchase error:', error)
    return NextResponse.json(
      { error: 'クレジットパック購入セッションの作成に失敗しました' },
      { status: 500 }
    )
  }
}